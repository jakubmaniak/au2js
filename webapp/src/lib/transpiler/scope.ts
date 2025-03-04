import uid from '../helpers/uid';
import { BlockType } from '../types/block-type';


export class Scope {
    id: string;
    level = 0;
    parent?: Scope;
    children = new Set<Scope>();
    statics = new Set<string>();
    requiresLabel = false;

    constructor(public type: BlockType) {
        this.id = type.toLowerCase() + '_' + uid();
    }

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

    hasAncestor(type: BlockType, { includeSelf = true } = { }) {
        if (includeSelf && this.type == type) return true;

        let scope: Scope = this;
        while (scope.parent) {
            if (scope.parent.type == type) return true;
            scope = scope.parent;
        }

        return false;
    }

    ofType(type: BlockType | BlockType[], { includeSelf = true } = { }) {
        const types = Array.isArray(type) ? type : [type];

        if (includeSelf && types.includes(this.type)) {
            return this;
        }

        let scope: Scope = this;
        while (scope.parent) {
            if (types.includes(scope.parent.type)) {
                return scope.parent;
            }
            scope = scope.parent;
        }
    }
}