import { App, Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import { config } from "dotenv";
import {
  Site,
  ApiResources,
  LambdaResources,
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

    const lambdaResources = new LambdaResources(this, "LambdaResources", {
      anthropicModel: props.anthropicModel,
    });

    const appSyncResources = new AppSyncResources(this, "AppSyncResources", {
      promptsTable: dynamoDbResources.promptsTable,
      promptGeneratorLambda: lambdaResources.promptGeneratorLambda,
      authenticatedRole: cognitoResources.authenticatedRole,
      userPool: cognitoResources.userPool,
    });

    lambdaResources.promptGeneratorLambda.addEnvironment(
      "APPSYNC_ENDPOINT",
      appSyncResources.graphQlApi.graphqlUrl
    );

    lambdaResources.promptGeneratorLambda.addEnvironment(
      "APPSYNC_API_KEY",
      appSyncResources.graphQlApi.apiKey!
    );

    lambdaResources.promptGeneratorLambda.addEnvironment(
      "ANTHROPIC_MODEL",
      props.anthropicModel
    );

    lambdaResources.promptGeneratorLambda.addEnvironment(
      "BEDROC_REGION",
      props.bedrockRegion
    );

    const stateMachineNameResources = new StateMachineResources(
      this,
      "StateMachineResources",
      {
        promptGeneratorLambda: lambdaResources.promptGeneratorLambda,
      }
    );

    stateMachineNameResources.promptGenerationStateMachine.grantExecution(
      lambdaResources.requestHandlerLambda
    );

    lambdaResources.promptGeneratorLambda.addEnvironment(
      "PROMPT_GENERATION_STATE_MACHINE_ARN",
      stateMachineNameResources.promptGenerationStateMachine.stateMachineArn
    );

    const apiResources = new ApiResources(this, "ApiResources", {
      userPool: cognitoResources.userPool,
      requestHandlerLambda: lambdaResources.requestHandlerLambda,
    });

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
