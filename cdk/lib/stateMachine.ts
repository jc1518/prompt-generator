import { Duration } from "aws-cdk-lib";
import {
  ManagedPolicy,
  Role,
  ServicePrincipal,
  PolicyStatement,
} from "aws-cdk-lib/aws-iam";
import { Runtime, Architecture, Function } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { StateMachine, DefinitionBody } from "aws-cdk-lib/aws-stepfunctions";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";

interface StateMachineResourceProps {
  anthropicModel: string;
}

export class StateMachineResources extends Construct {
  public promptGenerationStateMachine: StateMachine;
  public promptGeneratorLambda: Function;
  constructor(scope: Construct, id: string, props: StateMachineResourceProps) {
    super(scope, id);

    const generatorRole = new Role(this, "promptGeneratorRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    generatorRole.addToPrincipalPolicy(
      new PolicyStatement({
        actions: ["bedrock:*"],
        resources: ["*"],
      })
    );

    const promptGeneratorLambda = new NodejsFunction(
      this,
      "promptGeneratorLambda",
      {
        entry: "./lib/resources/promptGenerator/index.ts",
        runtime: Runtime.NODEJS_LATEST,
        architecture: Architecture.ARM_64,
        handler: "lambdaHandler",
        timeout: Duration.minutes(5),
        role: generatorRole,
        environment: {
          ANTHROPIC_MODEL: props.anthropicModel,
        },
      }
    );

    // Prompt Generation State Machine
    const promptGenerationTask = new LambdaInvoke(
      this,
      "PromptGenerationTask",
      {
        lambdaFunction: promptGeneratorLambda,
        outputPath: "$.Payload",
      }
    );

    const promptGenerationDefinition = promptGenerationTask;

    const promptGenerationStateMachine = new StateMachine(
      this,
      "PromptGenerationStateMachine",
      {
        definitionBody: DefinitionBody.fromChainable(
          promptGenerationDefinition
        ),
        timeout: Duration.minutes(5),
        stateMachineName: "PromptGenerationStateMachine",
      }
    );

    this.promptGenerationStateMachine = promptGenerationStateMachine;
    this.promptGeneratorLambda = promptGeneratorLambda;
  }
}
