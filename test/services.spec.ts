import { Properties } from "../src/services/properties";

describe("Properties tests", () => {
    test("Simple properties", () => {
        Properties.set('name', 'Luis');
        expect(Properties.get('name')).toEqual('Luis');
    });
});
