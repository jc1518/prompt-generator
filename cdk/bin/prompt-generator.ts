#!/usr/bin/env node
import "source-map-support/register";
import { App, Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import { PromptGeneratorStack } from "../lib/prompt-generator-stack";

const props = {
  logLevel: process.env.LOG_LEVEL || "",
  allowedDomain: process.env.ALLOWED_DOMAIN || "amazon.com",
  anthropicModel:
    process.env.ANTHROPIC_MODEL || "anthropic.claude-3-5-sonnet-20240620-v1:0",
  bedrockRegion: process.env.BEDROCK_REGION || "us-west-2",
};

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: "us-west-2",
};

const app = new App();

new PromptGeneratorStack(app, "PromptGenerator", {
  ...props,
  env: devEnv,
});

app.synth();
