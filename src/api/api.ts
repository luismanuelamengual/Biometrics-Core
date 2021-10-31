import {CodeError, MockItem} from "../models";
import {Events, Properties} from "../services";

export abstract class Api {

    public static readonly UNEXPECTED_RESPONSE_ERROR_CODE = 1;
    public static readonly AUTHORIZATION_KEY_MISSING_ERROR_CODE = 2;
    public static readonly AUTHORIZATION_FAILED_ERROR_CODE = 3;
    public static readonly SERVICE_FAILED_ERROR_CODE = 4;
    
    public static readonly CALL_START_EVENT = 'apiCall';
    public static readonly CALL_ERROR_EVENT = 'apiCallError';
    public static readonly CALL_SUCCESS_EVENT = 'apiCallSuccess';

    public static readonly BASE_URL_PROPERTY = 'api.baseUrl';
    public static readonly MOCK_DATA_PROPERTY = 'api.mockData';
    public static readonly API_KEY_PROPERTY = 'api.key';

    private static readonly DEFAULT_BASE_URL = 'https://biometrics-server.herokuapp.com/';

    private _baseUrl: string;
    private _mockData: Array<MockItem>;
    private _apiKey: string;

    public get baseUrl(): string {
        let baseUrl = this._baseUrl;
        if (!baseUrl) {
            baseUrl = Properties.get(Api.BASE_URL_PROPERTY);
            if (!baseUrl) {
                baseUrl = Api.DEFAULT_BASE_URL;
            }
        }
        return baseUrl;
    }

    public set baseUrl(value: string) {
        this._baseUrl = value;
    }

    public get mockData(): Array<MockItem> {
        return this._mockData ?? Properties.get(Api.MOCK_DATA_PROPERTY, []);
    }

    public set mockData(value: Array<MockItem>) {
        this._mockData = value;
    }

    public get apiKey(): string {
        return this._apiKey ?? Properties.get(Api.API_KEY_PROPERTY, null);
    }

    public set apiKey(apiKey: string) {
        this._apiKey = apiKey;
    }

    protected async call(endpoint: string, body?: any, options?: { method?: string, headers?: {[key: string]: string} }): Promise<any> {
        if (endpoint.startsWith('/')) {
            endpoint = endpoint.substr(1);
        }
        const method = options?.method ?? 'POST';
        let baseUrl = this.baseUrl;
        if (baseUrl) {
            baseUrl = baseUrl.trim();
            if (baseUrl.endsWith('/')) {
                baseUrl = baseUrl.substr(0, baseUrl.length - 1);
            }
        }
        let url = baseUrl;
        url += '/' + endpoint;
        Events.trigger(Api.CALL_START_EVENT, {url});
        let headers = options?.headers ?? {};
        if (typeof body !== 'string' && !(body instanceof FormData)) {
            body = JSON.stringify(body);
            headers['Content-Type'] = 'application/json';
        }
        const apiKey = this.apiKey;
        if (!apiKey) {
            this.onApiFail(url, Api.AUTHORIZATION_KEY_MISSING_ERROR_CODE, 'Api Key is missing !!');
        }
        headers['Authorization'] = 'Bearer ' + apiKey;

        const mockData = this.mockData;
        let responseObject;
        const mockItem = mockData.find((item) => {
            let mockItemMatch = false;
            if (!item.method || item.method === method) {
                let mockItemEndpoint = item.endpoint.trim();
                if (mockItemEndpoint.startsWith('/')) {
                    mockItemEndpoint = mockItemEndpoint.substr(1);
                }
                if (mockItemEndpoint === endpoint) {
                    mockItemMatch = true;
                }
            }
            return mockItemMatch;
        });

        try {
            if (mockItem) {
                responseObject = await this.fetchFromMockItem(mockItem, {url, method, headers, body});
            } else {
                responseObject = await this.fetch({url, headers, method, body});
            }
        } catch (e) {
            this.onApiFail(url, Api.UNEXPECTED_RESPONSE_ERROR_CODE, 'Unexpected server error. Message: ' + e.message);
        }

        const statusCode = responseObject.status;
        let response: any = responseObject.response;

        if (statusCode != 200) {
            if (statusCode === 401) {
                this.onApiFail(url, Api.AUTHORIZATION_FAILED_ERROR_CODE, 'Authorization failed');
            } else {
                this.onApiFail(url, Api.UNEXPECTED_RESPONSE_ERROR_CODE, `Server responded with incorrect status code (${statusCode})`);
            }
        }

        if (!response.success) {
            this.onApiFail(url, Api.SERVICE_FAILED_ERROR_CODE, response.message);
        }

        this.onApiSuccess(url, statusCode, response);
        return response;
    }

    private onApiSuccess (url: string, statusCode: number, response: any) {
        Events.trigger(Api.CALL_SUCCESS_EVENT, {url, statusCode, response});
    }

    private onApiFail (url: string, code: number, message: string) {
        Events.trigger(Api.CALL_ERROR_EVENT, {url, code, message});
        throw new CodeError(code, message);
    }

    private async fetch(request: {url: string, method: string, headers: {[key: string]: string}, body: any}): Promise<{status: number, response: any}> {
        const fetchResponse = await fetch(request.url, request);
        return {status: fetchResponse.status, response: await fetchResponse.json()};
    }

    private fetchFromMockItem(mockItem: MockItem, request: {url: string, method: string, headers: {[key: string]: string}, body: any}): Promise<{status: number, response: any}> {
        return new Promise<{status: number, response: string}>((resolve) => {
            let mockItemEndpoint = mockItem.endpoint.trim();
            if (mockItemEndpoint.startsWith('/')) {
                mockItemEndpoint = mockItemEndpoint.substr(1);
            }
            console.groupCollapsed('Calling mock service "' + mockItemEndpoint + '" ...');
            console.log('Request: ', request);
            try {
                let mockItemResponse = null;
                if (typeof mockItem.response === 'function') {
                    let bodyContent = request.body;
                    if (bodyContent) {
                        try {
                            bodyContent = JSON.parse(bodyContent);
                        } catch (e) {
                        }
                        mockItemResponse = mockItem.response(bodyContent);
                    }
                } else {
                    mockItemResponse = mockItem.response;
                }

                let responseJSON: any;
                if (typeof mockItemResponse === 'string') {
                    try {
                        responseJSON = JSON.parse(mockItemResponse);
                    } catch(e) {
                        responseJSON = mockItemResponse;
                    }
                } else {
                    responseJSON = mockItemResponse;
                }
                const status = mockItem.statusCode ?? 200;
                const onMockServiceComplete = () => {
                    console.log('Response: ', {status, response: responseJSON});
                    console.groupEnd();
                    resolve({status, response: responseJSON});
                }
                if (mockItem.responseDelay) {
                    setTimeout(() => onMockServiceComplete(), mockItem.responseDelay);
                } else {
                    onMockServiceComplete();
                }
            } catch(e) {
                console.log(e);
                console.groupEnd();
                throw e;
            }
        });
    }
}
