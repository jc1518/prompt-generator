import { App, Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { config } from "dotenv";
import {
  Site,
  ApiResources,
  Cognito,
  DynamoDBResources,
  AppSyncResources,
  StateMachineResources,
} from ".";

config();

export interface PromptGeneratorProps extends StackProps {
  logLevel: string;
  allowedDomain: string;
  anthropicModel: string;
  bedrockRegion: string;
}

export class PromptGeneratorStack extends Stack {
  constructor(scope: Construct, id: string, props: PromptGeneratorProps) {
    super(scope, id, props);

    const cognitoResources = new Cognito(this, "Cognito", {
      allowedDomain: props.allowedDomain,
    });

    const dynamoDbResources = new DynamoDBResources(this, "DynamoDBResources");

    const stateMachineNameResources = new StateMachineResources(
      this,
      "StateMachineResources",
      {
        anthropicModel: props.anthropicModel,
      }
    );

    const appSyncResources = new AppSyncResources(this, "AppSyncResources", {
      promptsTable: dynamoDbResources.promptsTable,
      authenticatedRole: cognitoResources.authenticatedRole,
      userPool: cognitoResources.userPool,
    });

    appSyncResources.graphQlApi.grantMutation(
      stateMachineNameResources.promptGeneratorLambda
    );

    stateMachineNameResources.promptGeneratorLambda.addEnvironment(
      "APPSYNC_ENDPOINT",
      appSyncResources.graphQlApi.graphqlUrl
    );

    stateMachineNameResources.promptGeneratorLambda.addEnvironment(
      "APPSYNC_API_KEY",
      appSyncResources.graphQlApi.apiKey!
    );

    stateMachineNameResources.promptGeneratorLambda.addEnvironment(
      "ANTHROPIC_MODEL",
      props.anthropicModel
    );

    stateMachineNameResources.promptGeneratorLambda.addEnvironment(
      "BEDROCK_REGION",
      props.bedrockRegion
    );

    const apiResources = new ApiResources(this, "ApiResources", {
      userPool: cognitoResources.userPool,
    });

    stateMachineNameResources.promptGenerationStateMachine.grantStartExecution(
      apiResources.requestHandlerLambda
    );

    apiResources.requestHandlerLambda.addEnvironment(
      "PROMPT_GENERATION_STATE_MACHINE_ARN",
      stateMachineNameResources.promptGenerationStateMachine.stateMachineArn
    );

    const site = new Site(this, "Site", {
      graphQlUrl: appSyncResources.graphQlApi.graphqlUrl,
      apiUrl: apiResources.requestHandlerurl,
      userPool: cognitoResources.userPool,
      userPoolClient: cognitoResources.userPoolClient,
      userPoolRegion: cognitoResources.userPoolRegion,
      identityPool: cognitoResources.identityPool,
      graphQlApiKey: appSyncResources.graphQlApi.apiKey!,
    });

    new CfnOutput(this, "siteBucket", { value: site.siteBucket.bucketName });
    new CfnOutput(this, "promptGeneratorSite", {
      value: site.distribution.distributionDomainName,
    });
  }
}
