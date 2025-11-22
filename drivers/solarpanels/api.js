const Homey = require('homey');
const crypto = require("crypto");

module.exports = class MyApi extends Homey.Api {
    
    async fetchData(request_path, request_param, http_method, api_Key, api_Secret) {
 
        console.log('API request called');
        //throw new Error("API call rejected");
        const axios = require("axios"); 
        const timestamp = Date.now().toString();
        const myUUID = uuidFromTimestamp(Date.now());
        const nonce = myUUID.replace(/-/g, "");

        const signature_method = 'HmacSHA256';
        const apiKey = api_Key;
        const apiSecret = String(api_Secret);
        const base_url = "https://api.apsystemsema.com:9282";
        
        const urlSegments = request_path.split("/");
        const lastSegment = urlSegments[urlSegments.length - 1];
        const stringToSign = `${timestamp}/${nonce}/${apiKey}/${lastSegment}/${http_method}/${signature_method}`;

        console.log('Request path:', request_path);
        console.log('Last segment:', lastSegment);
        console.log('String to sign:', stringToSign);


        const hmacSha256 = crypto.createHmac("sha256", apiSecret);
        hmacSha256.update(stringToSign);
        const signature = hmacSha256.digest("base64");

        const headers = {
            "X-CA-AppId": apiKey,
            "X-CA-Timestamp": timestamp,
            "X-CA-Nonce": nonce,
            "X-CA-Signature-Method": signature_method,
            "X-CA-Signature": signature,
        };

        const url = base_url + request_path + request_param;
        console.log('Complete URL:', url);
        //console.log('Laatste segment:', lastSegment);


        try {
            const response = await axios.get(url, { headers });
            console.log("API Response:", response.data, response.status, response.statusText, response.data && response.data.code);

            if (response && response.data && response.data.code === 2005) {
                throw new Error(JSON.stringify({
                    message: "API call rejected",
                    code: response.data.code,
                    details: response.data
                }));
            }

            return response.data;
        } catch (error) {
            // Log the error with as much detail as possible
            console.error("API Error:", error && error.message ? error.message : error);

            // If axios returned a response with useful error info, normalize and rethrow
            if (error && error.response && error.response.data) {
                const errPayload = {
                    message: error.response.data.message || 'API error',
                    code: error.response.data.code || error.response.status,
                    details: error.response.data
                };
                throw new Error(JSON.stringify(errPayload));
            }

            // Otherwise rethrow the original error
            throw error;
        }
    }

}

function uuidFromTimestamp(timestamp) {
  const hexTimestamp = timestamp.toString(16);
  const randomPart = crypto.randomBytes(8).toString('hex');
  return `${hexTimestamp}-${randomPart.slice(0,4)}-${randomPart.slice(4,8)}-${randomPart.slice(8,12)}-${randomPart.slice(12,16)}`;
}
