const MockModel = require('./MockModel');
const MockQuery = require('./MockQuery');

class ScheduleEvent extends MockModel {
    constructor(data) {
        super('schedules', data);
    }

    static find(query) {
        return new MockQuery('schedules', query, 'find');
    }

    static findById(id) {
        return new MockQuery('schedules', id, 'findById');
    }

    static findOne(query) {
        return new MockQuery('schedules', query, 'findOne');
    }

    static countDocuments(query) {
        return new MockQuery('schedules', query, 'countDocuments');
    }

    static async distinct(field, query = {}) {
        const docs = await this.find(query);
        const values = docs.map(d => d[field]).filter(Boolean);
        return [...new Set(values)];
    }

    static async aggregate(pipeline) {
        return MockQuery.aggregate('schedules', pipeline);
    }
}

module.exports = ScheduleEvent;
