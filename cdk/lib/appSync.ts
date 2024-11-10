import { Duration, Expiration } from "aws-cdk-lib";
import {
  AuthorizationType,
  GraphqlApi,
  SchemaFile,
  MappingTemplate,
  FieldLogLevel,
} from "aws-cdk-lib/aws-appsync";
import { IUserPool } from "aws-cdk-lib/aws-cognito";
import { TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { IRole } from "aws-cdk-lib/aws-iam";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

interface AppSyncResourcesProps {
  promptsTable: TableV2;
  promptGeneratorLambda: IFunction;
  userPool: IUserPool;
  authenticatedRole: IRole;
}

export class AppSyncResources extends Construct {
  public graphQlApi: GraphqlApi;

  constructor(scope: Construct, id: string, props: AppSyncResourcesProps) {
    super(scope, id);

    this.graphQlApi = new GraphqlApi(this, "PromptGeneratorApi", {
      name: "PromptGeneratorApi",
      definition: {
        schema: SchemaFile.fromAsset("./lib/resources/graphql/schema.graphql"),
      },
      logConfig: {
        retention: RetentionDays.ONE_WEEK,
        fieldLogLevel: FieldLogLevel.ALL,
      },
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: props.userPool,
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: AuthorizationType.API_KEY,
            apiKeyConfig: {
              expires: Expiration.after(Duration.days(365)),
            },
          },
        ],
      },
      xrayEnabled: true,
    });

    this.graphQlApi.grantMutation(props.promptGeneratorLambda);
    this.graphQlApi.grantSubscription(props.authenticatedRole);
    this.graphQlApi.grantQuery(props.authenticatedRole);

    const promptsTableDataSource = this.graphQlApi.addDynamoDbDataSource(
      "PromptsTableDataSource",
      props.promptsTable
    );

    this.createPromptResolvers(promptsTableDataSource);
  }

  private createPromptResolvers(dataSource: any) {
    dataSource.createResolver("DeletePrompt", {
      typeName: "Mutation",
      fieldName: "deletePrompt",
      requestMappingTemplate: MappingTemplate.fromFile(
        "./lib/resources/graphql/Mutation.DeletePrompt.req.vtl"
      ),
      responseMappingTemplate: MappingTemplate.fromFile(
        "./lib/resources/graphql/Mutation.DeletePrompt.res.vtl"
      ),
    });

    dataSource.createResolver("GetPrompt", {
      typeName: "Query",
      fieldName: "getPrompt",
      requestMappingTemplate: MappingTemplate.fromFile(
        "./lib/resources/graphql/Query.GetPrompt.req.vtl"
      ),
      responseMappingTemplate: MappingTemplate.fromFile(
        "./lib/resources/graphql/Query.GetPrompt.res.vtl"
      ),
    });

    dataSource.createResolver("ListPrompts", {
      typeName: "Query",
      fieldName: "listPrompts",
      requestMappingTemplate: MappingTemplate.fromFile(
        "./lib/resources/graphql/Query.ListPrompts.req.vtl"
      ),
      responseMappingTemplate: MappingTemplate.fromFile(
        "./lib/resources/graphql/Query.ListPrompts.res.vtl"
      ),
    });

    dataSource.createResolver("GetAllPrompts", {
      typeName: "Query",
      fieldName: "getAllPrompts",
      requestMappingTemplate: MappingTemplate.fromFile(
        "./lib/resources/graphql/Query.GetAllPrompts.req.vtl"
      ),
      responseMappingTemplate: MappingTemplate.fromFile(
        "./lib/resources/graphql/Query.GetAllPrompts.res.vtl"
      ),
    });

    dataSource.createResolver("PutPrompt", {
      typeName: "Mutation",
      fieldName: "putPrompt",
      requestMappingTemplate: MappingTemplate.fromFile(
        "./lib/resources/graphql/Mutation.PutPrompt.req.vtl"
      ),
      responseMappingTemplate: MappingTemplate.fromFile(
        "./lib/resources/graphql/Mutation.PutPrompt.res.vtl"
      ),
    });

    dataSource.createResolver("UpdatePrompt", {
      typeName: "Mutation",
      fieldName: "updatePrompt",
      requestMappingTemplate: MappingTemplate.fromFile(
        "./lib/resources/graphql/Mutation.UpdatePrompt.req.vtl"
      ),
      responseMappingTemplate: MappingTemplate.fromFile(
        "./lib/resources/graphql/Mutation.UpdatePrompt.res.vtl"
      ),
    });
  }
}
