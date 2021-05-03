// Receiving and Deleting Messages from a Queue
// https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/sqs-examples-send-receive-messages.html

const base64 = require('base-64');
const fetch = require('node-fetch');

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

    const queueURL = "https://sqs.us-east-1.amazonaws.com/640615917264/Q1.fifo";

    console.log(data.Records);

    if (data.Records) {
        // One of the attribute value
        console.log(data.Records[0].messageAttributes.location.stringValue);
        const cuisine = data.Records[0].messageAttributes.cuisine.stringValue;
        const numberOfPeople = data.Records[0].messageAttributes.numberOfPeople.stringValue;
        const date = data.Records[0].messageAttributes.date.stringValue;
        const time = data.Records[0].messageAttributes.time.stringValue;
        const phoneNumber = data.Records[0].messageAttributes.phoneNumber.stringValue;


        const url = 'https://search-restaurants-dxtikcwo22drfvdbezfulpktwe.us-east-1.es.amazonaws.com/restaurants/_search?q=_id:' + cuisine;
        const username = 'username';
        const password = 'password';
        const headers = { 'Authorization': 'Basic ' + base64.encode(username + ":" + password) };

        const obj = {
            method: 'GET',
            headers: headers
        };

        fetch(url, obj)
            .then(function(response) {
                return response.json();
            })
            .then(function(myJson) {
                console.log(myJson);
                // Attention: Task should be done with this block due to time cost
                const restaurantList = myJson['hits']['hits'][0]['_source']['restaurant_id'];
                console.log(restaurantList);

                let restaurant1 = restaurantList[Math.floor(Math.random() * restaurantList.length)];
                let restaurant2 = null;
                while (restaurant2 == null || restaurant2 === restaurant1) {
                    restaurant2 = restaurantList[Math.floor(Math.random() * restaurantList.length)];
                }
                let restaurant3 = null;
                while (restaurant3 == null || restaurant3 === restaurant1 || restaurant3 === restaurant2) {
                    restaurant3 = restaurantList[Math.floor(Math.random() * restaurantList.length)];
                }

                readDBBatch(restaurant1, restaurant2, restaurant3, cuisine, numberOfPeople, date, time, phoneNumber);

            });


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

function readDBBatch(key1, key2, key3, cuisine, numberOfPeople, date, time, phoneNumber) {
    // Reading Items in Batch   
    // https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/dynamodb-example-table-read-write-batch.html
    // Load the AWS SDK for Node.js
    // var AWS = require('aws-sdk');
    // Set the region 
    // AWS.config.update({ region: 'REGION' });

    // Create DynamoDB service object
    const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

    const params = {
        RequestItems: {
            'yelp-restaurants': {
                Keys: [
                    { 'restaurant_id': { S: key1 } },
                    { 'restaurant_id': { S: key2 } },
                    { 'restaurant_id': { S: key3 } }
                ],
                ProjectionExpression: 'restaurant_id, #name, address',
                ExpressionAttributeNames: { "#name": "name" }
            }
        }
    };

    ddb.batchGetItem(params, function(err, data) {
        if (err) {
            console.log("Error", err);
        }
        else {
            let textMessage = 'Hello! Here are my ' + cuisine + ' restaurant suggestions for ' + numberOfPeople + ' people, for ' + date + ' at ' + time + ': ';
            let count = 1;
            data.Responses['yelp-restaurants'].forEach(function(element, index, array) {
                console.log(element);
                if (count < 3) {
                    textMessage += count + '. ' + element['name']['S'] + ', located at ' + element['address']['S'] + ', ';
                }
                else {
                    textMessage += count + '. ' + element['name']['S'] + ', located at ' + element['address']['S'] + '. Enjoy your meal!';
                }
                count++;
            });
            sendSMS(textMessage, phoneNumber);
            saveRecommendationTo(textMessage, phoneNumber);
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

function saveRecommendationTo(textMessage, phoneNumber) {
    const e164PhoneNumber = convertToE164phoneNumber(phoneNumber);
    // https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/dynamodb-example-table-read-write.html

    // Create the DynamoDB service object
    const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

    const params = {
        TableName: 'recommendation-last-search',
        Item: {
            'userid': { S: e164PhoneNumber },
            'text_message': { S: textMessage },
            'insertedAtTimestamp': { S: Date.now().toString() }
        }
    };

    // Call DynamoDB to add the item to the table
    ddb.putItem(params, function(err, data) {
        if (err) {
            console.log("Error", err);
        }
        else {
            console.log("Success", data);
        }
    });
}


exports.handler = function(event, context, callback) {
    sqsHelper(event);
};
