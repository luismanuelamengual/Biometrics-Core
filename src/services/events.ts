
class EventsService {
    private listeners: {[key: string]: Array<(data?: any) => void>} = {};

    public trigger(event: string, data?: any) {
        if (this.listeners[event]) {
            for (const listener of this.listeners[event]) {
                try {
                    listener(data);
                } catch (e) {
                    console.warn(e);
                }
            }
        }
    }

    public on(event: string, listener: (data?: any) => void) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }

    public off(event: string, listener: (data?: any) => void) {
        const index: number = this.listeners[event].indexOf(listener);
        if (index > -1) {
            delete this.listeners[event][index];
        }
    }
}

export const Events = new EventsService();
