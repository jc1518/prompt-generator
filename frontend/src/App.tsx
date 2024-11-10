import React, { useState } from "react";
import { AmplifyConfig } from "./Config";
import {
  ContentLayout,
  Header,
  SpaceBetween,
  AppLayout,
  Button,
  Container,
} from "@cloudscape-design/components";
import { Amplify } from "aws-amplify";
// import "@aws-amplify/ui-react/styles.css";
import { Authenticator } from "@aws-amplify/ui-react";
import { GraphQL } from "./GraphQL";
import { Prompt } from "./Definitions";
import { Generation } from "./Generation";
import { generateClient } from "aws-amplify/api";
import * as mutations from "./graphql/mutations";
import { signOut } from "aws-amplify/auth";

const client = generateClient();
Amplify.configure(AmplifyConfig);

const App: React.FC = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [copiedTask] = useState<string | null>(null);

  const handleNewPrompt = (newPrompt: Prompt) => {
    setPrompts((prevPrompts) => [...prevPrompts, newPrompt]);
  };

  const handlePromptsUpdated = (updatedPrompts: Prompt[]) => {
    setPrompts(updatedPrompts);
  };

  const handlePromptUpdated = (updatedPrompt: Prompt) => {
    setPrompts((prevPrompts) =>
      prevPrompts.map((prompt) =>
        prompt.id === updatedPrompt.id ? updatedPrompt : prompt
      )
    );
  };

  const handleDeletePrompt = async (promptId: string) => {
    console.log("Deleting prompt:", promptId);
    try {
      await client.graphql({
        query: mutations.deletePrompt,
        variables: { id: promptId },
      });
    } catch (error) {
      console.error("Error deleting prompt:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // Add any additional logic after successful sign out, if needed
    } catch (error) {
      console.log("Error signing out:", error);
    }
  };

  return (
    <Authenticator>
      <AppLayout
        content={
          <ContentLayout
            header={
              <SpaceBetween size="m">
                <Header
                  variant="h1"
                  actions={<Button onClick={handleSignOut}>Sign Out</Button>}
                >
                  Prompt Generator
                </Header>
              </SpaceBetween>
            }
          >
            <Container>
              <SpaceBetween size="xl">
                <Generation
                  prompts={prompts}
                  copiedTask={copiedTask}
                  onDeletePrompt={handleDeletePrompt}
                />
                <GraphQL
                  onNewPrompt={handleNewPrompt}
                  onPromptsUpdated={handlePromptsUpdated}
                  onPromptUpdated={handlePromptUpdated}
                  onPromptDeleted={handleDeletePrompt}
                />
              </SpaceBetween>
            </Container>
          </ContentLayout>
        }
        navigationHide={true}
        toolsHide={true}
      />
    </Authenticator>
  );
};

export default App;
