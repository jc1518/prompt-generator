import {
  ApolloClient,
  InMemoryCache,
  gql,
  createHttpLink,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import {
  BedrockRuntimeClient,
  ContentBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { converseWithModel } from "./bedrockConverse";
import { promptTemplate } from "./prompt";
import { typeDefs } from "./typeDefs";

const APPSYNC_ENDPOINT = process.env.APPSYNC_ENDPOINT;
const APPSYNC_API_KEY = process.env.APPSYNC_API_KEY;
const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL || "anthropic.claude-3-5-sonnet-20240620-v1:0";
const BEDROC_REGION = process.env.BEDROCK_REGION || "us-west-2";

const httpLink = createHttpLink({
  uri: APPSYNC_ENDPOINT,
});

const authLink = setContext((_, { headers }) => {
  return {
    headers: {
      ...headers,
      "x-api-key": APPSYNC_API_KEY,
    },
  };
});

const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  typeDefs: typeDefs,
});

const UPDATE_PROMPT_MUTATION_WITH_PROMPT = gql`
  mutation UpdatePrompt($id: ID!, $status: PromptStatus!, $prompt: String) {
    updatePrompt(id: $id, status: $status, prompt: $prompt) {
      id
      owner
      prompt
      status
      task
      variables
    }
  }
`;

const UPDATE_PROMPT_MUTATION = gql`
  mutation UpdatePrompt($id: ID!, $status: PromptStatus!) {
    updatePrompt(id: $id, status: $status) {
      id
      owner
      prompt
      status
      task
      variables
    }
  }
`;

export const lambdaHandler = async (event: any): Promise<void> => {
  console.log(event);
  const { promptId, task, variables = [] } = event;

  try {
    console.log(
      `Updating AppSync with promptID: ${promptId} and status: GENERATING`
    );
    const generatingResponse = await apolloClient.mutate({
      mutation: UPDATE_PROMPT_MUTATION,
      variables: {
        id: promptId,
        status: "GENERATING",
      },
    });
    console.log(
      `Generating Response: ${JSON.stringify(generatingResponse, null, 2)}`
    );

    const updatedPrompt = promptTemplate.replace("{{TASK}}", task);
    console.log(`Updated Prompt: ${updatedPrompt}`);

    let variableString = "";
    variableString = variables
      .map((variable: string) => `{${variable.toUpperCase()}}`)
      .join("\n");

    let assistantPartial = "";
    if (variableString) {
      assistantPartial += "<Inputs>";
      assistantPartial += variableString + "\n</Inputs>\n";
    }
    assistantPartial += "<Instructions Structure>";
    console.log(`AssistantPartial: \n${assistantPartial}`);

    const bedrockClient = new BedrockRuntimeClient({
      region: BEDROC_REGION,
    });

    const response = await converseWithModel(BEDROC_REGION, ANTHROPIC_MODEL, [
      { role: "user", content: [{ text: updatedPrompt }] },
      { role: "assistant", content: [{ text: assistantPartial }] },
    ]);
    console.log(response);
    const content = response.output?.message?.content ?? [];
    console.log(content);
    const generatedPrompt = extractPrompt(content);
    console.log(`Response: \n${JSON.stringify(generatedPrompt, null, 2)}`);

    console.log(
      `Updating AppSync with promptID: ${promptId} and status: GENERATED`
    );
    const generatedResponse = await apolloClient.mutate({
      mutation: UPDATE_PROMPT_MUTATION_WITH_PROMPT,
      variables: {
        id: promptId,
        status: "GENERATED",
        prompt: generatedPrompt,
      },
    });
    console.log(
      `Generated Response: ${JSON.stringify(generatedResponse, null, 2)}`
    );
  } catch (error) {
    console.error("Error generating prompt:", error);

    // Update the status to "ERROR" if an error occurs during prompt generation
    await apolloClient.mutate({
      mutation: UPDATE_PROMPT_MUTATION,
      variables: {
        id: promptId,
        status: "ERROR",
      },
    });
  }
};

function extractBetweenTags(
  tag: string,
  text: string,
  strip: boolean = false
): string[] {
  const regex = new RegExp(`<${tag}>(.+?)</${tag}>`, "gs");
  const matches = text.match(regex);
  if (matches) {
    return strip
      ? matches.map((match) => match.replace(regex, "$1").trim())
      : matches.map((match) => match.replace(regex, "$1"));
  }
  return [];
}

function removeEmptyTags(text: string): string {
  return text.replace(/<(\w+)><\/\1>$/g, "");
}

function extractPrompt(content: ContentBlock[]): string {
  // Validate input
  if (!Array.isArray(content) || content.length === 0) {
    throw new Error("Invalid or empty content array");
  }

  const textBlock = content.find(
    (block) => "text" in block && block.text!.trim().length > 0
  );

  console.log(textBlock);

  if (!textBlock || !("text" in textBlock)) {
    throw new Error("No valid text content found in the response");
  }

  const metapromptResponse = textBlock.text;
  const instructions = extractBetweenTags("Instructions", metapromptResponse!);

  if (!instructions.length) {
    throw new Error("No Instructions tags found in the response");
  }

  const cleanedInstructions = instructions[0]
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return removeEmptyTags(cleanedInstructions);
}
