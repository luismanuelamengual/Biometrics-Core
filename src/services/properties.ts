
class PropertiesService {
    private properties: object = {};

    public load(properties: any): void {
        this.properties = properties;
    }

    public clear() {
        this.properties = {};
    }

    public getAll(): any {
        return this.properties;
    }

    public set(key: string, value: any) {
        let propertyObject = this.properties;
        const keyParts = key.split('.');
        for (let i = 0; i < (keyParts.length - 1); i++) {
            const keyPart = keyParts[i];
            if (!(keyPart in propertyObject)) {
                propertyObject[keyPart] = {};
            }
            propertyObject = propertyObject[keyPart];
        }
        const lastKeyPart = keyParts[keyParts.length - 1];
        propertyObject[lastKeyPart] = value;
    }

    public get(key: string, defaulValue = null, params?: {[key: string]: string}): any {
        let propertyObject = this.properties;
        const keyParts = key.split('.');
        for (let i = 0; i < (keyParts.length - 1); i++) {
            const keyPart = keyParts[i];
            if (keyPart in propertyObject) {
                propertyObject = propertyObject[keyPart];
            } else {
                propertyObject = null;
                break;
            }
        }
        const lastKeyPart = keyParts[keyParts.length - 1];
        let value = (propertyObject != null && lastKeyPart in propertyObject) ? propertyObject[lastKeyPart] : defaulValue;
        if (typeof value === 'function') {
            value = value();
        }
        if (params && typeof value === 'string') {
            for (const key in params) {
                value = value.replace(`$${key}`, params[key]);
            }
        }
        return value;
    }
}

export const Properties = new PropertiesService();
