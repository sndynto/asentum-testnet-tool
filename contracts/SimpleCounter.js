// Simple Counter Smart Contract for Asentum VM (Plain JavaScript)

function initialize() {
    storage.set('counter', 0);
    storage.set('owner', msg.sender);
    emit('Initialized', { owner: msg.sender });
}

function increment() {
    const current = storage.get('counter') || 0;
    const next = current + 1;
    storage.set('counter', next);
    emit('Incremented', { by: msg.sender, counter: next });
    return next;
}

function getCount() {
    return storage.get('counter') || 0;
}
