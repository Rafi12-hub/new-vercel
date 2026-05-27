const MockModel = require('./MockModel');
const MockQuery = require('./MockQuery');

class Submission extends MockModel {
    constructor(data) {
        super('submissions', data);
    }

    static find(query) {
        return new MockQuery('submissions', query, 'find');
    }

    static findById(id) {
        return new MockQuery('submissions', id, 'findById');
    }

    static findOne(query) {
        return new MockQuery('submissions', query, 'findOne');
    }

    static countDocuments(query) {
        return new MockQuery('submissions', query, 'countDocuments');
    }

    static async distinct(field, query = {}) {
        const docs = await this.find(query);
        const values = docs.map(d => d[field]).filter(Boolean);
        return [...new Set(values)];
    }

    static async aggregate(pipeline) {
        return MockQuery.aggregate('submissions', pipeline);
    }
}

module.exports = Submission;
