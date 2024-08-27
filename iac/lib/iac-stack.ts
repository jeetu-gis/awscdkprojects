import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sqs from 'aws-cdk-lib/aws-sqs';// Step1
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"; // step2
import { RemovalPolicy, aws_ec2 } from "aws-cdk-lib"; //step2
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import * as lamda from "aws-cdk-lib/aws-lambda";

export class IacStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    //remove cdk.
    super(scope, id, props);

    // The code that defines your stack goes here

    // Step1: resource
     const queue = new sqs.Queue(this, 'IacQueue', {
       visibilityTimeout: cdk.Duration.seconds(300)
     });

    // VPC
    const vpc = new aws_ec2.Vpc(this, "vpc", {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: "public-subnet",
          subnetType: aws_ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "private-subnet",
          subnetType: aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: "isolated-subnet",
          subnetType: aws_ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    const s3LogBucket = new cdk.aws_s3.Bucket(this, "s3LogBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      accessControl: cdk.aws_s3.BucketAccessControl.LOG_DELIVERY_WRITE,
      encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
      intelligentTieringConfigurations: [
        {
          name: "archive",
          archiveAccessTierTime: cdk.Duration.days(90),
          deepArchiveAccessTierTime: cdk.Duration.days(180),
        },
      ],
    });

    const vpcFlowLogRole = new cdk.aws_iam.Role(this, "vpcFlowLogRole", {
      assumedBy: new cdk.aws_iam.ServicePrincipal(
        "vpc-flow-logs.amazonaws.com"
      ),
    });
    s3LogBucket.grantWrite(vpcFlowLogRole, "sharedVpcFlowLogs/*");

    // Create flow logs to S3.
    new aws_ec2.FlowLog(this, "sharedVpcLowLogs", {
      destination: aws_ec2.FlowLogDestination.toS3(
        s3LogBucket,
        "sharedVpcFlowLogs/"
      ),
      trafficType: aws_ec2.FlowLogTrafficType.ALL,
      flowLogName: "sharedVpcFlowLogs",
      resourceType: aws_ec2.FlowLogResourceType.fromVpc(vpc),
    });
    //VPC Endpoints improve security, since your data does not mix with public Internet traffic.

    //Add vpc endpoints
    vpc.addGatewayEndpoint("dynamoDBEndpoint", {
      service: aws_ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    });
    vpc.addGatewayEndpoint("s3Endpoint", {
      service: aws_ec2.GatewayVpcEndpointAwsService.S3,
    });

    // end of VPC

    // Step2: dynamo db table
    // const dynamodb_table = new cdk.aws_dynamodb.Table(this, "iac-stack-table", {
    //   partitionKey: { name: "id", type: cdk.aws_dynamodb.AttributeType.STRING },
    //   tableName: "iac-stack-table",
    //   removalPolicy: cdk.RemovalPolicy.DESTROY, // not a default behavior
    // });
    // //step3:define lambda function and redefrence functon file
    // const lamda_backend = new NodejsFunction(this, "function", {
    //   tracing: lamda.Tracing.ACTIVE, // X-Ray to troubleshoot
    //   environment: {
    //     DYNAMODB: dynamodb_table.tableName,
    //   },
    // });

    // //grant lambda permission to access dynamo db table as read
    // dynamodb_table.grantReadData(lamda_backend.role!);

    // //step4:define apigateway
    // const api = new apigateway.RestApi(this, "Restapi", {
    //   deployOptions: {
    //     dataTraceEnabled: true,
    //     tracingEnabled: true,
    //     loggingLevel: apigateway.MethodLoggingLevel.INFO,
    //   },
    // });

    // //step5:define endpoint and assoccate lambda function
    // const endpoint = api.root.addResource("endpoint");
    // endpoint.addMethod("GET", new apigateway.LambdaIntegration(lamda_backend));
  }
}
