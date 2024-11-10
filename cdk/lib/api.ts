import { Duration } from "aws-cdk-lib";
import {
  RestApi,
  LambdaIntegration,
  EndpointType,
  MethodLoggingLevel,
  CognitoUserPoolsAuthorizer,
  AuthorizationType,
} from "aws-cdk-lib/aws-apigateway";
import { IUserPool } from "aws-cdk-lib/aws-cognito";
import { Function } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

interface ApiResourcesProps {
  readonly userPool: IUserPool;
  readonly requestHandlerLambda: Function;
}

export class ApiResources extends Construct {
  public requestHandlerurl: string;

  constructor(scope: Construct, id: string, props: ApiResourcesProps) {
    super(scope, id);

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

    const promptIntegration = new LambdaIntegration(props.requestHandlerLambda);

    const createPrompt = requestHandlerApi.root.addResource("createPrompt");

    createPrompt.addMethod("POST", promptIntegration, {
      authorizer: auth,
      authorizationType: AuthorizationType.COGNITO,
    });

    this.requestHandlerurl = requestHandlerApi.url;
  }
}
