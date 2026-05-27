const { db } = require('../config/firebase');

class MockModel {
    constructor(collectionName, data = {}) {
        this._collectionName = collectionName;
        Object.assign(this, data);
    }

    async save() {
        const collection = db.collection(this._collectionName);
        
        // Remove internal properties
        const payload = { ...this };
        delete payload._collectionName;
        delete payload._id;
        delete payload.id;

        // Clean up undefined fields
        for (const [k, v] of Object.entries(payload)) {
            if (v === undefined) {
                delete payload[k];
            }
        }

        const docId = this._id || this.id;
        if (docId) {
            await collection.doc(docId).set(payload, { merge: true });
            return this;
        } else {
            const docRef = await collection.add(payload);
            this._id = docRef.id;
            this.id = docRef.id;
            return this;
        }
    }

    toObject() {
        const obj = { ...this };
        delete obj._collectionName;
        return obj;
    }
}

module.exports = MockModel;
