import {CodeError, MockItem} from "../models";
import {Events, Properties} from "../services";

export abstract class Api {

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

    protected get baseUrl(): string {
        let baseUrl = this._baseUrl;
        if (!baseUrl) {
            baseUrl = Properties.get(Api.BASE_URL_PROPERTY);
            if (!baseUrl) {
                baseUrl = Api.DEFAULT_BASE_URL;
            }
        }
        return baseUrl;
    }

    protected set baseUrl(value: string) {
        this._baseUrl = value;
    }

    protected get mockData(): Array<MockItem> {
        return this._mockData ?? Properties.get(Api.MOCK_DATA_PROPERTY, []);
    }

    protected set mockData(value: Array<MockItem>) {
        this._mockData = value;
    }

    protected get apiKey(): string {
        return this._apiKey ?? Properties.get(Api.API_KEY_PROPERTY, null);
    }

    protected set apiKey(apiKey: string) {
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
            this.onApiFail(url,-1,'Api Key is missing !!');
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
            this.onApiFail(url,-1,'Unexpected server error. Message: ' + e.message);
        }

        const statusCode = responseObject.status;
        let response: any = responseObject.response;

        if (statusCode != 200) {
            this.onApiFail(url,-1, `Server responded with incorrect status code (${statusCode})`);
        }

        if (!response.success) {
            this.onApiFail(url,-1, response.message);
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
