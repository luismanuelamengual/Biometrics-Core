import {Api} from "./api";

export class BiometricsApi extends Api {

    public async checkLiveness3d(faceImage: Blob, zoomedFaceImage: Blob): Promise<{liveness: boolean, reason?: number}> {
        const formData = new FormData();
        formData.append('picture', faceImage);
        formData.append('zoomedPicture', zoomedFaceImage);
        const response = await this.call('v1/check_liveness_3d', formData);
        return response.data;
    }
}

export const Biometrics = new BiometricsApi();
