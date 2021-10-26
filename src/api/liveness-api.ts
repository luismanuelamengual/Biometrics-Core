import {Api} from "./api";

class LivenessApi extends Api {

    public async checkLiveness3d(faceImage: Blob, zoomedFaceImage: Blob): Promise<boolean> {
        const formData = new FormData();
        formData.append('picture', faceImage);
        formData.append('zoomedPicture', zoomedFaceImage);
        const response = await this.call('v1/check_liveness_3d', formData);
        return response.data.liveness;
    }
}

export const Liveness = new LivenessApi();
