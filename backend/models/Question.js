const MockModel = require('./MockModel');
const MockQuery = require('./MockQuery');

class Question extends MockModel {
    constructor(data) {
        super('questions', data);
    }

    static find(query) {
        return new MockQuery('questions', query, 'find');
    }

    static findById(id) {
        return new MockQuery('questions', id, 'findById');
    }

    static findOne(query) {
        return new MockQuery('questions', query, 'findOne');
    }

    static countDocuments(query) {
        return new MockQuery('questions', query, 'countDocuments');
    }

    static async distinct(field, query = {}) {
        const docs = await this.find(query);
        const values = docs.map(d => d[field]).filter(Boolean);
        return [...new Set(values)];
    }

    static async aggregate(pipeline) {
        return MockQuery.aggregate('questions', pipeline);
    }
}

module.exports = Question;
