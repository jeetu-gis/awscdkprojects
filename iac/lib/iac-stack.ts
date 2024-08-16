import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
//import * as sqs from 'aws-cdk-lib/aws-sqs';
//import * as sqs from 'aws-cdk-lib/aws-sqs';// Step1
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'; // step2
import { RemovalPolicy } from 'aws-cdk-lib'; //step2
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import * as lamda from 'aws-cdk-lib/aws-lambda';


export class IacStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) { //remove cdk.
    super(scope, id, props);

    // The code that defines your stack goes here

    // Step1: resource
    //  const queue = new sqs.Queue(this, 'IacQueue', {
    //    visibilityTimeout: cdk.Duration.seconds(300)
    //  });

    // Step2: dynamo db table
    const dynamodb_table = new cdk.aws_dynamodb.Table(this, 'iac-stack-table', {
      partitionKey: { name: 'id', type: cdk.aws_dynamodb.AttributeType.STRING },
      tableName: 'iac-stack-table',
      removalPolicy: cdk.RemovalPolicy.DESTROY // not a default behavior
    })
    //step3:define lambda function and redefrence functon file
    const lamda_backend = new NodejsFunction(this, 'function', {
      tracing: lamda.Tracing.ACTIVE, // X-Ray to troubleshoot
      environment: {
        DYNAMODB:dynamodb_table.tableName
      }
    })

    //grant lambda permission to access dynamo db table as read
    dynamodb_table.grantReadData(lamda_backend.role!)

    //step4:define apigateway
    const api = new apigateway.RestApi(this, 'Restapi', {
      deployOptions: {
        dataTraceEnabled: true,
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO
      }
    })

    //step5:define endpoint and assoccate lambda function
    const endpoint = api.root.addResource('endpoint')
    endpoint.addMethod('GET', new apigateway.LambdaIntegration(lamda_backend))

    
  }
}
