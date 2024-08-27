import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { join } from "path";
import fs from "fs-extra";
import { fileURLToPath } from "url";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from "aws-cdk-lib/custom-resources";

//DB Layer
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb"; // import * as sqs from 'aws-cdk-lib/aws-sqs';
//API Layer
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from "aws-cdk-lib/aws-apigatewayv2";
import { CfnOutput } from "aws-cdk-lib";
import { CoreDnsComputeType } from "aws-cdk-lib/aws-eks";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Architecture, DockerImageFunction } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import path = require("path");
import { ExecSyncOptions, execSync } from "child_process";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { CacheControl } from "aws-cdk-lib/aws-codepipeline-actions";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

export class ServerlessStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    // DB Layer
    // note: Demo-quality props. For production, you want a different removalPolicy and possibly a different billingMode.
    const table = new Table(this, "mylocationsTable", {
      partitionKey: { name: "pk", type: AttributeType.STRING },
      sortKey: { name: "sk", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "mylocationsTable",
    });

    // API Layer

    const readFunction = new NodejsFunction(this, "readLocationFunction", {
      architecture: Architecture.ARM_64,
      entry: `${__dirname}/fns/readFunction.ts`,
      logRetention: RetentionDays.ONE_WEEK,
      // timeout: cdk.Duration.seconds(30),
      // memorySize: 1024,
    });

    const writeFunction = new NodejsFunction(this, "writeLocationFunction", {
      architecture: Architecture.ARM_64,
      entry: `${__dirname}/fns/writeFunction.ts`,
      logRetention: RetentionDays.ONE_WEEK,
      // timeout: cdk.Duration.seconds(30),
      // memorySize: 1024,
    });
    table.grantReadData(readFunction);
    table.grantWriteData(writeFunction);

    const api = new HttpApi(this, "mylocationsApi", {
      corsPreflight: {
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
        ],
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ["*"],
      },
    });

    // create Cfn AWS::ApiGatewayV2::Api integration
    const readIntegration = new HttpLambdaIntegration(
      "readIntegration",
      readFunction
    );
    const writeIntegration = new HttpLambdaIntegration(
      "writeIntegration",
      writeFunction
    );

    // create Cfn AWS::ApiGatewayV2::Route rources, path to integration
    api.addRoutes({
      integration: readIntegration,
      methods: [HttpMethod.GET],
      path: "/locations",
    });

    api.addRoutes({
      integration: writeIntegration,
      methods: [HttpMethod.POST],
      path: "/locations",
    });

    // Storage for assets only. Not an S3 website
    const websiteBucket = new cdk.aws_s3.Bucket(this, "websiteBucket", {
      autoDeleteObjects: true,
      blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    //grant access for distribution
    const originAccessIdentity = new cdk.aws_cloudfront.OriginAccessIdentity(
      this,
      "originAccessIdentity"
    );

    websiteBucket.grantRead(originAccessIdentity);

    // cloudfront distribution with SPA config & https
    const distribution = new cdk.aws_cloudfront.Distribution(
      this,
      "distribution",
      {
        defaultBehavior: {
          origin: new cdk.aws_cloudfront_origins.S3Origin(websiteBucket, {
            originAccessIdentity,
          }),
          //allowedMethods: cdk.aws_cloudfront.AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy:
            cdk.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        defaultRootObject: "index.html",
        errorResponses: [
          {
            httpStatus: 404,
            ttl: cdk.Duration.seconds(0),
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
        ],
      }
    );

    const ececOptions: ExecSyncOptions = {
      stdio: ["inherit", "inherit", "inherit"],
    };

    // Run vite build for react app, then copy to cdk output
    // const bundle = Source.asset(join(__dirname, "web"), {
    //   bundling: {
    //     command: [
    //       "sh",
    //       "-c",
    //       'echo "Docker build not supported. Please install esbuild."',
    //     ],
    //     image: cdk.DockerImage.fromRegistry("alpine"),
    //     local: {
    //       tryBundle(outputDir: string) {
    //         try {
    //           execSync("esbuild --version", ececOptions);
    //         } catch {
    //           return false;
    //         }
    //         execSync("npx vite build", ececOptions);
    //         fs.copySync(join(__dirname, "../dist"), outputDir, {
    //           overwrite: true,
    //         });
    //         return true;
    //       },
    //     },
    //   },
    // });

    // // SET Prune to false or the config.json will be overwritten
    // //if deploying frequently, we should clean up the older files
    // new BucketDeployment(this, "deploy", {
    //   destinationBucket: websiteBucket,
    //   distribution,
    //   logRetention: RetentionDays.ONE_DAY,
    //   prune: false,
    //   sources: [bundle],
    // });

    // // generate the config.json file and put into the S3 for the web app to get API URL
    // new AwsCustomResource(this, "ApiUrlResouece", {
    //   logRetention: RetentionDays.ONE_DAY,
    //   onUpdate: {
    //     action: "putObject",
    //     parameters: {
    //       Bucket: websiteBucket.bucketName,
    //       CacheControl: "max-age=0, no-cache, no-store, must-revalidate",
    //       Contenttype: "application/json",
    //       Key: "config.json",
    //       Body: cdk.Stack.of(this).toJsonString({
    //         [this.stackName]: { HttpApiUrl: api.apiEndpoint },
    //       }),
    //     },
    //     physicalResourceId: PhysicalResourceId.of("ApiUrlResouece"),
    //     service: "S3",
    //   },
    // });

    // policy: AwsCustomResourcePolicy.fromStatements([
    //   new PolicyStatement({
    //     actions: ["s3:PutObject"],
    //     resources: [websiteBucket.arnForObjects("config.json")],
    //   }),
    // ]),
    //   new CfnOutput(this, "HttpApiUrl", { value: api.apiEndpoint });

    // new CfnOutput(this, "DistributionDomainName", {
    //   value: distribution.distributionDomainName,
    // });
    // Add AWS::ApiGatewayV2::Route resources, assigning a path to the API.
  }
}
