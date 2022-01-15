import { DraggableLocation } from "react-beautiful-dnd";
import { QueryClient } from "react-query";
import {
  WorkflowStateFieldsFragment as TWorkflowState,
  useCardHistoryQuery,
  useKanbanDataQuery,
} from "./generated/graphql";
import { TWorkflow, TCard } from "./types";

export type ObjectKeys<T> = T extends object
  ? (keyof T)[]
  : T extends number
  ? []
  : T extends Array<any> | string
  ? string[]
  : never;

export interface ObjectConstructor {
  keys<T>(o: T): ObjectKeys<T>;
}

export function mapKeys<T, K extends keyof T>(
  obj: T,
  mapper: (key: K) => K
): { [P in K]: T[P] } {
  return Object.keys(obj).reduce((acc, key) => {
    return { ...acc, [mapper(key as K)]: obj[key as K] };
  }, {} as { [P in K]: T[P] });
}

export function isDefined<T>(argument: T | undefined): argument is T {
  return argument !== undefined;
}
export function notEmpty<TValue>(
  value: TValue | null | undefined
): value is TValue {
  if (value === null || value === undefined) return false;
  return true;
}

export function distinctBy<T>(array: Array<T>, propertyName: keyof T) {
  return array.filter(
    (e, i) => array.findIndex((a) => a[propertyName] === e[propertyName]) === i
  );
}

export function indexById<T extends { id: string }>(
  array: Array<T>
): { [id: string]: T } {
  const initialValue = {};
  return array.reduce((obj, item) => {
    return {
      ...obj,
      [item.id]: item,
    };
  }, initialValue);
}

export function immutableMove<T>(arr: Array<T>, from: number, to: number) {
  return arr.reduce((prev, current, idx, self) => {
    if (from === to) {
      prev.push(current);
    }
    if (idx === from) {
      return prev;
    }
    if (from < to) {
      prev.push(current);
    }
    if (idx === to) {
      prev.push(self[from]);
    }
    if (from > to) {
      prev.push(current);
    }
    return prev;
  }, [] as Array<T>);
}

function addInArrayAtPosition(array: any, element: any, position: number) {
  const arrayCopy = [...array];
  arrayCopy.splice(position, 0, element);
  return arrayCopy;
}

function removeFromArrayAtPosition(array: any[], position: any) {
  return array.reduce(
    (acc: any, value: any, idx: any) =>
      idx === position ? acc : [...acc, value],
    []
  );
}

function identity(value: any) {
  return value;
}

function when(value: any, predicate = identity) {
  return function callback(callback: (arg0: any) => any) {
    if (predicate(value)) return callback(value);
  };
}

function replaceElementOfArray(array: any[]) {
  return function (options: {
    when: (arg0: any) => any;
    for: (arg0: any) => any;
  }) {
    return array.map((element: any) =>
      options.when(element) ? options.for(element) : element
    );
  };
}

function pickPropOut(object: { [x: string]: any }, prop: string) {
  return Object.keys(object).reduce((obj, key) => {
    return key === prop ? obj : { ...obj, [key]: object[key] };
  }, {});
}

function reorderCardsOnWorkflowState(
  workflowState: TWorkflowState,
  reorderCards: (cards: TCard[]) => TCard[]
): TWorkflowState {
  if (!workflowState?.cards) return workflowState;
  return {
    ...workflowState,
    cards: reorderCards(workflowState.cards.filter(notEmpty)),
  };
}

function moveWorkflowState(
  workflow: { workflowStates: any },
  { fromPosition }: any,
  { toPosition }: any
) {
  return {
    ...workflow,
    workflowStates: immutableMove(
      workflow.workflowStates,
      fromPosition,
      toPosition
    ),
  };
}

function hasDuplicateCards(col: TWorkflowState) {
  const cards = col?.cards?.filter(notEmpty) ?? [];
  if (cards.length > 0) {
    return cards.filter(notEmpty).some((card, index) => {
      return cards.findIndex((c) => c.id === card.id) !== index;
    });
  }
}

function moveCard(
  workflow: TWorkflow,
  { index: fromPosition, droppableId: fromWorkflowStateId }: DraggableLocation,
  { index: toPosition, droppableId: toWorkflowStateId }: DraggableLocation
) {
  if (!workflow) return;
  const cols = workflow.workflowStates.filter(notEmpty).map((col) => {
    return {
      ...col,
      cards: col.cards?.filter(notEmpty) ?? [],
    };
  });
  const sourceWorkflowState = cols.find(
    (workflowState) => workflowState.id === fromWorkflowStateId
  );
  const destinationWorkflowState = cols.find(
    (workflowState) => workflowState.id === toWorkflowStateId
  );

  if (!sourceWorkflowState || !destinationWorkflowState) return workflow;

  const reorderWorkflowStatesOnWorkflow = (
    reorderWorkflowStatesMapper: (col: TWorkflowState) => TWorkflowState
  ) => ({
    ...workflow,
    workflowStates: cols.map(reorderWorkflowStatesMapper),
  });

  if (sourceWorkflowState.id === destinationWorkflowState.id) {
    const reorderedCardsOnWorkflowState = reorderCardsOnWorkflowState(
      sourceWorkflowState,
      (cards: TCard[]) => {
        return immutableMove(cards, fromPosition, toPosition);
      }
    );
    return reorderWorkflowStatesOnWorkflow((workflowState: TWorkflowState) =>
      workflowState.id === sourceWorkflowState.id
        ? reorderedCardsOnWorkflowState
        : workflowState
    );
  } else {
    const reorderedCardsOnSourceWorkflowState = reorderCardsOnWorkflowState(
      sourceWorkflowState,
      (cards: TCard[]) => {
        return removeFromArrayAtPosition(cards, fromPosition);
      }
    );
    const reorderedCardsOnDestinationWorkflowState =
      reorderCardsOnWorkflowState(
        destinationWorkflowState,
        (cards: TCard[]) => {
          return addInArrayAtPosition(
            cards,
            sourceWorkflowState.cards[fromPosition],
            toPosition
          );
        }
      );
    return reorderWorkflowStatesOnWorkflow((workflowState: TWorkflowState) => {
      if (workflowState.id === sourceWorkflowState.id)
        return reorderedCardsOnSourceWorkflowState;
      if (workflowState.id === destinationWorkflowState.id)
        return reorderedCardsOnDestinationWorkflowState;
      return workflowState;
    });
  }
}

function addWorkflowState(
  workflow: { workflowStates: string | any[] },
  workflowState: any
) {
  return {
    ...workflow,
    workflowStates: addInArrayAtPosition(
      workflow.workflowStates,
      workflowState,
      workflow.workflowStates.length
    ),
  };
}

function removeWorkflowState(
  workflow: { workflowStates: any[] },
  workflowState: { id: any }
) {
  return {
    ...workflow,
    workflowStates: workflow.workflowStates.filter(
      ({ id }) => id !== workflowState.id
    ),
  };
}

function changeWorkflowState(
  workflow: { workflowStates: any },
  workflowState: { id: any },
  newWorkflowState: any
) {
  const changedWorkflowStates = replaceElementOfArray(workflow.workflowStates)({
    when: ({ id }) => id === workflowState.id,
    for: (value: any) => ({ ...value, ...newWorkflowState }),
  });
  return { ...workflow, workflowStates: changedWorkflowStates };
}

function addCard(
  workflow: { workflowStates: any[] },
  inWorkflowState: { id: any },
  card: any,
  opts = { on: "top" }
) {
  const on = opts.on;
  const workflowStateToAdd = workflow.workflowStates.find(
    ({ id }) => id === inWorkflowState.id
  );
  const cards = addInArrayAtPosition(
    workflowStateToAdd.cards,
    card,
    on === "top" ? 0 : workflowStateToAdd.cards.length
  );
  const workflowStates = replaceElementOfArray(workflow.workflowStates)({
    when: ({ id }) => inWorkflowState.id === id,
    for: (value: any) => ({ ...value, cards }),
  });
  return { ...workflow, workflowStates };
}

function removeCard(
  workflow: { workflowStates: any[] },
  fromWorkflowState: { id: any },
  card: { id: any }
) {
  const workflowStateToRemove = workflow.workflowStates.find(
    ({ id }) => id === fromWorkflowState.id
  );
  const filteredCards = workflowStateToRemove.cards.filter(
    ({ id }: { id: string }) => card.id !== id
  );
  const workflowStateWithoutCard = {
    ...workflowStateToRemove,
    cards: filteredCards,
  };
  const filteredWorkflowStates = workflow.workflowStates.map(
    (workflowState: { id: any }) =>
      fromWorkflowState.id === workflowState.id
        ? workflowStateWithoutCard
        : workflowState
  );
  return { ...workflow, workflowStates: filteredWorkflowStates };
}

function changeCard(
  workflow: { workflowStates: any[] },
  cardId: any,
  newCard: any
) {
  const changedCards = (cards: any) =>
    replaceElementOfArray(cards)({
      when: ({ id }) => id === cardId,
      for: (card: any) => ({ ...card, ...newCard }),
    });

  return {
    ...workflow,
    workflowStates: workflow.workflowStates
      .filter(notEmpty)
      .map((workflowState: { cards: any[] }) => ({
        ...workflowState,
        cards: changedCards(workflowState.cards),
      })),
  };
}

const defaultMutationProps = (queryClient: QueryClient) => ({
  onSettled: () => {
    queryClient.refetchQueries(useKanbanDataQuery.getKey());
  },
});

export {
  defaultMutationProps,
  hasDuplicateCards,
  moveWorkflowState,
  moveCard,
  addWorkflowState,
  removeWorkflowState,
  changeWorkflowState,
  addCard,
  removeCard,
  changeCard,
};
