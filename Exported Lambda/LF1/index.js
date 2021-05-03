'use strict';


// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');


// Close dialog with the customer, reporting fulfillmentState of Failed or Fulfilled ("Thanks, your pizza will arrive in 20 minutes")
function close(sessionAttributes, fulfillmentState, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message,
        },
    };
}

// --------------- Events -----------------------

function dispatch(intentRequest, callback) {
    console.log(`request received for userId=${intentRequest.userId}, intentName=${intentRequest.currentIntent.name}`);
    const sessionAttributes = intentRequest.sessionAttributes;
    const slots = intentRequest.currentIntent.slots;
    const location = slots.location;
    const cuisine = slots.cuisine;
    const numberOfPeople = slots.numberOfPeople;
    const date = slots.date;
    const time = slots.time;
    const phoneNumber = slots.phoneNumber;
    const userid = slots.userid;

    const intentName = intentRequest.currentIntent.name;

    if (intentName === 'DiningSuggestionsIntent') {
        sqs_sendmessage(location, cuisine, numberOfPeople, date, time, phoneNumber);
        callback(close(sessionAttributes, 'Fulfilled', { 'contentType': 'PlainText', 'content': `You’re all set. Expect my suggestions shortly! Have a good day.` }));
    }
    else if (intentName === 'GreetingIntent') {
        callback(close(sessionAttributes, 'Fulfilled', { 'contentType': 'PlainText', 'content': `Hi there, how can I help?` }));
    }
    else if (intentName === 'RetrieveIntent') {
        sqs_sendmessage2(userid);
        callback(close(sessionAttributes, 'Fulfilled', { 'contentType': 'PlainText', 'content': `A text message will be sent to your phone number if a previous recommodation exists. Are there any other things I can help?` }));
    }
    else {
        callback(close(sessionAttributes, 'Fulfilled', { 'contentType': 'PlainText', 'content': `You’re welcome.` }));
    }

}

// Sending a Message to a Queue
// https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/sqs-examples-send-receive-messages.html
function sqs_sendmessage(location, cuisine, numberOfPeople, date, time, phoneNumber) {
    // Load the AWS SDK for Node.js
    // const AWS = require('aws-sdk');
    // Set the region
    AWS.config.update({
        accessKeyId: "accessKeyId",
        secretAccessKey: "secretAccessKey",
        region: 'us-east-1'
    });

    // Create an SQS service object
    const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

    const params = {
        // Remove DelaySeconds parameter and value for FIFO queues
        // DelaySeconds: 10,
        MessageAttributes: {
            "location": {
                DataType: "String",
                StringValue: location
            },
            "cuisine": {
                DataType: "String",
                StringValue: cuisine
            },
            "numberOfPeople": {
                DataType: "String",
                StringValue: numberOfPeople
            },
            "date": {
                DataType: "String",
                StringValue: date
            },
            "time": {
                DataType: "String",
                StringValue: time
            },
            "phoneNumber": {
                DataType: "String",
                StringValue: phoneNumber
            }
        },
        MessageBody: location + '|' + cuisine + '|' + numberOfPeople + '|' + date + '|' + time + '|' + phoneNumber + '|' + Date.now(),
        // Error InvalidParameterValue: The queue should either have ContentBasedDeduplication enabled or MessageDeduplicationId provided
        // MessageDeduplicationId: "TheWhistler",  // Required for FIFO queues
        MessageGroupId: "Group1", // Required for FIFO queues
        QueueUrl: "https://sqs.us-east-1.amazonaws.com/640615917264/Q1.fifo"
    };

    sqs.sendMessage(params, function(err, data) {
        if (err) {
            console.log("Error", err);
        }
        else {
            console.log("Success", data.MessageId);
        }
    });
}

function sqs_sendmessage2(userid) {
    // Load the AWS SDK for Node.js
    // const AWS = require('aws-sdk');
    // Set the region
    AWS.config.update({
        accessKeyId: "accessKeyId",
        secretAccessKey: "secretAccessKey",
        region: 'us-east-1'
    });

    // Create an SQS service object
    const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

    const params = {
        // Remove DelaySeconds parameter and value for FIFO queues
        // DelaySeconds: 10,
        MessageAttributes: {
            "userid": {
                DataType: "String",
                StringValue: userid
            }
        },
        MessageBody: userid + '|' + Date.now(),
        // Error InvalidParameterValue: The queue should either have ContentBasedDeduplication enabled or MessageDeduplicationId provided
        // MessageDeduplicationId: "TheWhistler",  // Required for FIFO queues
        MessageGroupId: "Group1", // Required for FIFO queues
        QueueUrl: "https://sqs.us-east-1.amazonaws.com/640615917264/Q2.fifo"
    };

    sqs.sendMessage(params, function(err, data) {
        if (err) {
            console.log("Error", err);
        }
        else {
            console.log("Success", data.MessageId);
        }
    });
}

// --------------- Main handler -----------------------

// Route the incoming request based on intent.
// The JSON body of the request is provided in the event slot.
exports.handler = (event, context, callback) => {
    try {
        dispatch(event,
            (response) => {
                callback(null, response);
            });
    }
    catch (err) {
        callback(err);
    }
};
