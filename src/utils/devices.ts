import DeviceDetector from "device-detector-js";

const deviceDetector = new DeviceDetector();
let deviceData = null;

export function getDeviceData(): object {
    if (!deviceData) {
        deviceData = deviceDetector.parse(navigator.userAgent);
    }
    return deviceData;
}