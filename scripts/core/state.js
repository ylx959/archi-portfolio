// Whether the visitor has passed the hero enter form, and the name they gave.
// Imported bindings are read-only, so this is exposed through accessors rather
// than as bare variables: the hero writes it, everything else reads it.
let hasEntered = false;
let submittedDisplayName = "";

export function isEntered() {
    return hasEntered;
}

export function getDisplayName() {
    return submittedDisplayName;
}

export function markEntered(name) {
    hasEntered = true;
    submittedDisplayName = name;
}

export function setDisplayName(name) {
    submittedDisplayName = name;
}
