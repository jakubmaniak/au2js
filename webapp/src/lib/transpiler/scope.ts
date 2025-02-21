import uid from '../helpers/uid';
import { BlockType } from '../types/block-type';


export class Scope {
    id = uid();
    level = 0;
    parent?: Scope;
    children = new Set<Scope>();
    statics = new Set<string>();

    constructor(public type: BlockType) { }

    enter(scope: Scope) {
        scope.level = this.level + 1;
        scope.parent = this;
        this.children.add(scope);
    }

    leave() {
        if (!this.parent) return;
        this.parent.children.delete(this);
        this.parent = undefined;
    }

    hasAncestor(type: BlockType, { includeSelf = false } = { }) {
        if (includeSelf && this.type == type) return true;

        let scope: Scope = this;
        while (scope.parent) {
            if (scope.parent.type == type) return true;
            scope = scope.parent;
        }

        return false;
    }

    findAncestor(type: BlockType, { includeSelf = false } = { }) {
        if (includeSelf && this.type == type) return this;

        let scope: Scope = this;
        while (scope.parent) {
            if (scope.parent.type == type) return scope.parent;
            scope = scope.parent;
        }
    }
}