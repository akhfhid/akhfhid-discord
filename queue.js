class MusicQueue {
    constructor() {
        this.queue = [];
        this.current = null;
    }

    add(track) {
        this.queue.push(track);
    }

    next() {
        return this.queue.shift();
    }

    hasNext() {
        return this.queue.length > 0;
    }
}

module.exports = new MusicQueue();
