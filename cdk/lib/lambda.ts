import { Duration } from "aws-cdk-lib";
import {
  ManagedPolicy,
  Role,
  ServicePrincipal,
  PolicyStatement,
} from "aws-cdk-lib/aws-iam";
import { Runtime, Architecture, Function } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

interface LambdaResourcesProps {
  anthropicModel: string;
}

export class LambdaResources extends Construct {
  public requestHandlerLambda: Function;
  public promptGeneratorLambda: Function;

  constructor(scope: Construct, id: string, props: LambdaResourcesProps) {
    super(scope, id);

    const requestHandlerRole = new Role(this, "requestHandlerRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

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

    this.promptGeneratorLambda = new NodejsFunction(
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

    this.requestHandlerLambda = new NodejsFunction(
      this,
      "requestHandlerLambda",
      {
        entry: "./lib/resources/requestHandler/index.ts",
        runtime: Runtime.NODEJS_LATEST,
        architecture: Architecture.ARM_64,
        handler: "lambdaHandler",
        timeout: Duration.minutes(5),
        role: requestHandlerRole,
      }
    );
  }
}
