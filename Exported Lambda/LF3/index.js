// Receiving and Deleting Messages from a Queue
// https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/sqs-examples-send-receive-messages.html


// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');
// Set the region
AWS.config.update({
    accessKeyId: "accessKeyId",
    secretAccessKey: "secretAccessKey",
    region: 'us-east-1'
});

function sqsHelper(data) {
    // Create an SQS service object
    const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

    const queueURL = "https://sqs.us-east-1.amazonaws.com/640615917264/Q2.fifo";

    console.log(data.Records);

    if (data.Records) {

        // One of the attribute value
        const userid = data.Records[0].messageAttributes.userid.stringValue;
        console.log(userid);

        const e164PhoneNumber = convertToE164phoneNumber(userid);
        getitemDB(e164PhoneNumber);


        const deleteParams = {
            QueueUrl: queueURL,
            ReceiptHandle: data.Records[0].receiptHandle
        };
        sqs.deleteMessage(deleteParams, function(err, data) {
            if (err) {
                console.log("Delete Error", err);
            }
            else {
                console.log("Message Deleted", data);
            }
        });
    }
}

function getitemDB(userid) {
    const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

    const params = {
        TableName: 'recommendation-last-search',
        Key: {
            'userid': { S: userid }
        },
        ProjectionExpression: 'userid, text_message'
    };

    // Call DynamoDB to read the item from the table
    ddb.getItem(params, function(err, data) {
        if (err) {
            console.log("Error", err);
        }
        else {
            console.log("Success", data.Item);
            if (data.Item !== undefined) {
                const textMessage = data.Item['text_message']['S'];
                sendSMS(textMessage, userid);
            }
        }
    });
}

function sendSMS(textMessage, phoneNumber) {
    // Load the AWS SDK for Node.js
    // var AWS = require('aws-sdk');
    // Set region
    // AWS.config.update({region: 'REGION'});

    // Create publish parameters
    const params = {
        Message: textMessage,
        /* required */
        PhoneNumber: convertToE164phoneNumber(phoneNumber),
    };

    // Create promise and SNS service object
    const publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' }).publish(params).promise();

    // Handle promise's fulfilled/rejected states
    publishTextPromise.then(
        function(data) {
            console.log("MessageID is " + data.MessageId);
        }).catch(
        function(err) {
            console.error(err, err.stack);
        });
}

// Covert to E.164 phone number
// Ref: https://gist.github.com/kevinweber/1249fde7b3d26fe73e1be0d52d3c023a
function convertToE164phoneNumber(phoneNumber) {
    let res = phoneNumber.match(/[0-9]{0,14}/g);
    if (res === null) {
        return '';
    }
    res = res.join('');
    if (res[0].includes('1')) {
        res = '+' + res;
    }
    else {
        res = '+1' + res;
    }
    res = res.substring(0, 15);
    return res;
}


exports.handler = function(event, context, callback) {
    sqsHelper(event);
};
