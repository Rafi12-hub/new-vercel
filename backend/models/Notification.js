const MockModel = require('./MockModel');
const MockQuery = require('./MockQuery');

class Notification extends MockModel {
    constructor(data) {
        super('notifications', data);
    }

    static find(query) {
        return new MockQuery('notifications', query, 'find');
    }

    static findById(id) {
        return new MockQuery('notifications', id, 'findById');
    }

    static findOne(query) {
        return new MockQuery('notifications', query, 'findOne');
    }

    static countDocuments(query) {
        return new MockQuery('notifications', query, 'countDocuments');
    }

    static async distinct(field, query = {}) {
        const docs = await this.find(query);
        const values = docs.map(d => d[field]).filter(Boolean);
        return [...new Set(values)];
    }

    static async aggregate(pipeline) {
        return MockQuery.aggregate('notifications', pipeline);
    }
}

module.exports = Notification;
