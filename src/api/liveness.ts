import {Api} from "./api";

export class LivenessApi extends Api {

    public async verifyLiveness(faceImage: Blob, zoomedFaceImage: Blob): Promise<{liveness: boolean, status?: number}> {
        const formData = new FormData();
        formData.append('picture', faceImage);
        formData.append('zoomedPicture', zoomedFaceImage);
        const response = await this.call('api/verify_liveness', formData);
        return response.data;
    }
}

export const Liveness = new LivenessApi();
