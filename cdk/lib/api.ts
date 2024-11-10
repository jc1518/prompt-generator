import { Duration } from "aws-cdk-lib";
import {
  RestApi,
  LambdaIntegration,
  EndpointType,
  MethodLoggingLevel,
  CognitoUserPoolsAuthorizer,
  AuthorizationType,
} from "aws-cdk-lib/aws-apigateway";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { IUserPool } from "aws-cdk-lib/aws-cognito";
import { Runtime, Architecture, Function } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

interface ApiResourcesProps {
  readonly userPool: IUserPool;
}

export class ApiResources extends Construct {
  public requestHandlerurl: string;
  public requestHandlerLambda: Function;

  constructor(scope: Construct, id: string, props: ApiResourcesProps) {
    super(scope, id);

    const requestHandlerRole = new Role(this, "requestHandlerRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });

    const requestHandlerLambda = new NodejsFunction(
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

    const requestHandlerApi = new RestApi(this, "requestHandlerAPI", {
      defaultCorsPreflightOptions: {
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "x-amz-security-token",
        ],
        allowMethods: ["OPTIONS", "POST", "GET"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
      restApiName: "requestHandlerAPI",
      deployOptions: {
        loggingLevel: MethodLoggingLevel.OFF,
        dataTraceEnabled: false,
      },
      endpointConfiguration: {
        types: [EndpointType.REGIONAL],
      },
    });

    const auth = new CognitoUserPoolsAuthorizer(this, "auth", {
      cognitoUserPools: [props.userPool],
    });

    const promptIntegration = new LambdaIntegration(requestHandlerLambda);

    const createPrompt = requestHandlerApi.root.addResource("createPrompt");

    createPrompt.addMethod("POST", promptIntegration, {
      authorizer: auth,
      authorizationType: AuthorizationType.COGNITO,
    });

    this.requestHandlerurl = requestHandlerApi.url;
    this.requestHandlerLambda = requestHandlerLambda;
  }
}
