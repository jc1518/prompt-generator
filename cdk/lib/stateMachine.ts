import { Duration } from "aws-cdk-lib";
import { Function } from "aws-cdk-lib/aws-lambda";
import { StateMachine, DefinitionBody } from "aws-cdk-lib/aws-stepfunctions";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";

interface StateMachineResourcesProps {
  promptGeneratorLambda: Function;
}

export class StateMachineResources extends Construct {
  public promptGenerationStateMachine: StateMachine;
  constructor(scope: Construct, id: string, props: StateMachineResourcesProps) {
    super(scope, id);

    // Prompt Generation State Machine
    const promptGenerationTask = new LambdaInvoke(
      this,
      "PromptGenerationTask",
      {
        lambdaFunction: props.promptGeneratorLambda,
        outputPath: "$.Payload",
      }
    );

    const promptGenerationDefinition = promptGenerationTask;

    this.promptGenerationStateMachine = new StateMachine(
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
  }
}
