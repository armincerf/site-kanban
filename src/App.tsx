import NaturalDragAnimation from "natural-drag-animation-rbdnd";
import { useHotkeys } from "react-hotkeys-hook";
import { useMobileDetect, useModalForm } from "./hooks";
import { Tabs } from "./components/Tabs";
import { Popover } from "./components/Popover";
import { Heading } from "./components/Headings";
import {
  AddWorkflowStateModal,
  UpdateWorkflowStateModal,
} from "./components/WorkflowStateForms";
import { AddProjectModal } from "./components/ProjectForms";
import { AddCardModal, UpdateCardModal } from "./components/CardForms";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DraggableLocation,
  DroppableProvided,
} from "react-beautiful-dnd";
import {
  useKanbanDataQuery,
  useDeleteWorkflowMutation,
  useDeleteWorkflowStateMutation,
  useMoveCardMutation,
  useAllProjectsQuery,
} from "./generated/graphql";
import { LocationGenerics, TWorkflow, TCard, TWorkflowState } from "./types";
import {
  defaultMutationProps,
  removeDuplicateCards,
  moveCard,
  notEmpty,
  uncompressBase64,
} from "./kanbanHelpers";
import { useQueryClient } from "react-query";
import React from "react";
import { toast } from "react-toastify";
import { useNavigate, useSearch } from "react-location";
import classNames from "classnames";
import _ from "lodash";

type CardProps = {
  card: TCard;
  workflow: TWorkflow;
  index: number;
};

const DraggableCard = React.memo(({ card, index, workflow }: CardProps) => {
  const [, setIsOpen] = useModalForm({
    formModalType: "editCard",
    cardId: card.id,
    workflowId: workflow?.id,
    workflowStateId: workflow?.workflowStates.find((state) =>
      state?.cards?.find((c) => c?.id === card.id)
    )?.id,
  });
  const imageString = card?.files?.filter((file) =>
    file?.type.startsWith("image")
  )?.[0]?.lzbase64;
  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => {
        const isDragging = snapshot.isDragging && !snapshot.isDropAnimating;
        const cardStyles = classNames(
          "bg-white rounded border-2 mb-2 p-2 border-gray-500 hover:border-blue-400",
          isDragging && "bg-blue-50 border-blue-400 shadow-lg"
        );
        return (
          <NaturalDragAnimation
            style={provided.draggableProps.style}
            snapshot={snapshot}
          >
            {(style: object) => (
              <div
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                style={style}
                className={cardStyles}
                onClick={() => workflow?.id && setIsOpen(true)}
                ref={provided.innerRef}
              >
                <pre>{card.id}</pre>
                <p>{card.title}</p>
                <p>{card.project?.name}</p>
                {card?.description && card.description !== "<p></p>" && (
                  <div
                    className="ProseMirror h-auto w-full"
                    dangerouslySetInnerHTML={{ __html: card.description }}
                  />
                )}
                {imageString && (
                  <img
                    src={uncompressBase64(imageString)}
                    width={100}
                    height={100}
                    className="rounded"
                    alt="Card Image"
                  />
                )}
              </div>
            )}
          </NaturalDragAnimation>
        );
      }}
    </Draggable>
  );
});

type WorkflowStateProps = {
  workflowState: TWorkflowState;
  isDragging: boolean;
  cards: TCard[];
  workflow: NonNullable<TWorkflow>;
};

const WorkflowState = React.memo(
  ({ workflowState, cards, workflow, isDragging }: WorkflowStateProps) => {
    const isFirst = workflow.workflowStates?.[0]?.id === workflowState.id;
    const [, setIsOpen] = useModalForm({
      formModalType: "editWorkflowState",
      workflowStateId: workflowState.id,
    });
    const [popoverEl, setPopoverEl] = React.useState<HTMLElement | null>(null);
    const [showPopper, setShowPopper] = React.useState(false);
    const detectMobile = useMobileDetect();
    return (
      <>
        {!isDragging && detectMobile.isDesktop() && (
          <Popover referenceEl={popoverEl} showPopper={showPopper}>
            <p>{workflowState.id}</p>
            <h1>{workflowState.name}</h1>
            <p>{workflowState.description}</p>
            <p>Click To Edit</p>
          </Popover>
        )}
        <Droppable droppableId={workflowState.id} type="card">
          {(provided, snapshot) => (
            <div
              style={{
                borderColor: snapshot.isDraggingOver ? "gray" : "white",
              }}
              className={classNames(
                "transition sm:mx-1 h-full border-4",
                isFirst && "sm:ml-0",
                snapshot.isDraggingOver &&
                  "bg-blue-50 shadow-sm  border-dashed  h-full",
                " mt-4 flex flex-col ",
                detectMobile.isMobile() &&
                  cards.length === 0 &&
                  !snapshot.isDraggingOver &&
                  " h-16",
                detectMobile.isMobile() &&
                  cards.length === 0 &&
                  snapshot.isDraggingOver &&
                  "h-36",
                cards.length > 0 && "min-w-fit ",
                cards.length === 0 && "relative"
              )}
            >
              <div
                onClick={() => workflow?.id && setIsOpen(true)}
                ref={setPopoverEl}
                onMouseEnter={() => setShowPopper(true)}
                onMouseLeave={() => setShowPopper(false)}
                className={classNames(
                  "prose xl:prose-xl cursor-pointer isolate",
                  cards.length === 0 &&
                    !snapshot.isDraggingOver &&
                    "sm:transition sm:rotate-90 sm:relative sm:top-2 sm:left-10 sm:origin-top-left sm:whitespace-nowrap"
                )}
              >
                {cards.length === 0 && !snapshot.isDraggingOver ? (
                  <>
                    <h3 className="text-white">col</h3>
                    <h3 className="absolute top-2">{workflowState.name}</h3>
                  </>
                ) : (
                  <h3>{workflowState.name}</h3>
                )}
              </div>

              <div
                className="h-full juxt-kanban-cols-container overflow-scroll no-scrollbar"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {cards.map((t, i) => (
                  <DraggableCard
                    key={t.id}
                    card={t}
                    workflow={workflow}
                    index={i}
                  />
                ))}
                {provided.placeholder}
              </div>
            </div>
          )}
        </Droppable>
      </>
    );
  }
);

function filteredCards(
  cards: TCard[] | undefined,
  filters: LocationGenerics["Search"]["filters"] | undefined
) {
  if (!filters) {
    return cards;
  }

  return (
    cards?.filter(
      (card) => !filters.projectId || card.project?.id === filters.projectId
    ) ?? []
  );
}

function processWorkflow(
  workflow: TWorkflow,
  filters: LocationGenerics["Search"]["filters"] | undefined
) {
  if (!workflow) return null;
  const workflowStates = workflow?.workflowStates.filter(notEmpty) || [];
  return {
    ...workflow,
    workflowStates: workflowStates.map((c) => ({
      ...c,
      cards: filteredCards(c.cards?.filter(notEmpty), filters),
    })),
  };
}

function WorkflowStateContainer({
  provided,
  isDragging,
  cols,
  workflow,
}: {
  provided: DroppableProvided;
  isDragging: boolean;
  cols: NonNullable<TWorkflowState[]>;
  workflow: NonNullable<TWorkflow>;
}) {
  return (
    <div
      className="isolate flex sm:flex-row flex-col max-w-full"
      {...provided.droppableProps}
      ref={provided.innerRef}
    >
      {cols.map((col) => {
        return (
          <WorkflowState
            key={col.id}
            isDragging={isDragging}
            workflowState={col}
            cards={col?.cards?.filter(notEmpty) || []}
            workflow={workflow}
          />
        );
      })}
      {provided.placeholder}
    </div>
  );
}

function Workflow({ workflow }: { workflow: TWorkflow }) {
  if (!workflow?.id) return null;
  const { filters } = useSearch<LocationGenerics>();
  const data = React.useMemo(
    () => processWorkflow(workflow, filters),
    [workflow, filters]
  );
  const [filteredState, setState] = React.useState<TWorkflow>();
  const unfilteredWorkflow = useKanbanDataQuery()?.data?.allWorkflows?.find(
    (c) => c?.id === workflow.id
  );
  React.useEffect(() => {
    if (data) {
      setState(data);
      console.log("workflow update from server");
    }
  }, [data]);
  const cols =
    filteredState?.workflowStates.filter(notEmpty).map((c) => {
      return {
        ...c,
        cards: c.cards?.filter(notEmpty) || [],
      };
    }) || [];
  const queryClient = useQueryClient();
  const moveCardMutation = useMoveCardMutation({
    ...defaultMutationProps(queryClient),
  });

  const updateServerCards = React.useCallback(
    (
      state: TWorkflow,
      startCol: TWorkflowState,
      endCol: TWorkflowState,
      source: DraggableLocation,
      destination: DraggableLocation
    ) => {
      if (startCol) {
        const cardsInSourceCol =
          state?.workflowStates
            .filter(notEmpty)
            .find((c) => c.id === source.droppableId)
            ?.cards?.filter(notEmpty)
            .map((c) => c.id) || [];
        moveCardMutation.mutate({
          workflowStateId: startCol?.id,
          cardIds: _.uniq(cardsInSourceCol),
        });
      }

      if (endCol && startCol !== endCol) {
        const cardsInEndCol =
          state?.workflowStates
            .filter(notEmpty)
            .find((c) => c.id === destination.droppableId)
            ?.cards?.filter(notEmpty)
            .map((c) => c.id) || [];
        moveCardMutation.mutate({
          workflowStateId: endCol?.id,
          cardIds: _.uniq(cardsInEndCol),
        });
      }
    },
    [moveCardMutation]
  );

  const [, setIsAddCard] = useModalForm({
    formModalType: "addCard",
    workflowId: workflow.id,
  });

  useHotkeys("n", () => {
    setIsAddCard(true);
  });
  const [isDragging, setIsDragging] = React.useState(false);

  return (
    <div className="px-4">
      <Heading workflow={workflow} handleAddCard={() => setIsAddCard(true)} />
      {filteredState && (
        <DragDropContext
          onDragStart={() => setIsDragging(true)}
          onDragEnd={({ destination, source, draggableId }) => {
            setIsDragging(false);
            if (
              !destination ||
              (destination.droppableId === source.droppableId &&
                destination.index === source.index)
            ) {
              return;
            }
            const newFilteredState = moveCard(
              filteredState,
              source,
              destination
            );
            const startCol = cols.find((c) => c.id === source.droppableId);
            const endCol = cols.find((c) => c.id === destination.droppableId);
            if (!startCol || !endCol) return;

            if (!filters || !Object.keys(filters) || !filters?.projectId) {
              // if there are no filters, just use the local state in the mutation
              updateServerCards(
                newFilteredState,
                startCol,
                endCol,
                source,
                destination
              );
            } else {
              // if there are filters, things are more tricky...
              // the general idea is to find the card behind the new location of our dragged card
              // and then find that previousCards index in the unfiltered workflow-state
              // then we can move the card in the unfiltered workflow-state and use that to update the server

              const unfilteredStartCol =
                unfilteredWorkflow?.workflowStates.find(
                  (c) => c?.id === source.droppableId
                );
              const unfilteredEndCol = unfilteredWorkflow?.workflowStates.find(
                (c) => c?.id === destination.droppableId
              );
              const unfilteredSourceIdx =
                unfilteredStartCol?.cards?.findIndex(
                  (c) => c?.id === draggableId
                ) || source.index;
              const newEndCol = newFilteredState?.workflowStates.find(
                (c) => c?.id === destination.droppableId
              );
              const unfilteredCardIdx = newEndCol?.cards?.findIndex(
                (c) => c?.id === draggableId
              );
              const endCards = newEndCol?.cards?.filter(notEmpty) || [];
              const prevCardId =
                destination.index === 0
                  ? undefined
                  : unfilteredCardIdx && endCards[unfilteredCardIdx - 1]?.id;
              const prevCardIdx = unfilteredEndCol?.cards?.findIndex(
                (c) => c?.id === prevCardId
              );
              const unfilteredSource = {
                ...source,
                index: unfilteredSourceIdx,
              };
              if (typeof prevCardIdx !== "number") {
                console.log("no prev card idx");
                return;
              }
              const isSameColMoveDown =
                source.droppableId === destination.droppableId &&
                source.index < destination.index;
              const newCardIdx = isSameColMoveDown
                ? prevCardIdx
                : prevCardIdx + 1;
              const unfilteredDestination = {
                ...destination,
                index: newCardIdx,
              };
              console.log(unfilteredSource, unfilteredDestination);

              const newState = moveCard(
                unfilteredWorkflow,
                unfilteredSource,
                unfilteredDestination
              );
              if (unfilteredStartCol && unfilteredEndCol) {
                updateServerCards(
                  newState,
                  unfilteredStartCol,
                  unfilteredEndCol,
                  unfilteredSource,
                  unfilteredDestination
                );
              }
            }

            setState(newFilteredState);
          }}
        >
          <Droppable
            droppableId="workflowStates"
            direction="horizontal"
            type="workflowState"
          >
            {(provided) => (
              <WorkflowStateContainer
                key={provided.droppableProps["data-rbd-droppable-context-id"]}
                isDragging={isDragging}
                workflow={workflow}
                provided={provided}
                cols={cols}
              />
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}

export function App() {
  const search = useSearch<LocationGenerics>();
  const refetch = search.modalState?.formModalType ? false : 2000;
  const kanbanQueryResult = useKanbanDataQuery(
    {},
    { refetchInterval: refetch }
  );
  const workflow = kanbanQueryResult.data?.allWorkflows?.[0];
  const navigate = useNavigate<LocationGenerics>();
  const [isModalOpen, setIsModalOpen] = useModalForm({
    formModalType: "addWorkflowState",
  });
  const [isCardModalOpen, setIsCardModalOpen] = useModalForm({
    formModalType: "editCard",
  });
  const [isWorkflowStateModalOpen, setIsWorkflowStateModalOpen] = useModalForm({
    formModalType: "editWorkflowState",
  });

  const [isAddCard, setIsAddCard] = useModalForm({
    formModalType: "addCard",
  });
  const [isAddProject, setIsAddProject] = useModalForm({
    formModalType: "addProject",
  });
  const projectQuery = useAllProjectsQuery();
  const projects = projectQuery.data?.allProjects || [];

  return (
    <div>
      {kanbanQueryResult.isLoading && <div>Loading...</div>}
      <AddWorkflowStateModal
        isOpen={!!isModalOpen}
        setIsOpen={setIsModalOpen}
      />
      <UpdateWorkflowStateModal
        isOpen={!!isWorkflowStateModalOpen}
        setIsOpen={setIsWorkflowStateModalOpen}
      />
      <UpdateCardModal
        isOpen={isCardModalOpen}
        setIsOpen={setIsCardModalOpen}
      />
      <AddCardModal isOpen={isAddCard} setIsOpen={setIsAddCard} />
      <AddProjectModal isOpen={isAddProject} setIsOpen={setIsAddProject} />
      <Tabs
        tabs={[...projects, { id: undefined, name: "All" }]
          .filter(notEmpty)
          .map((project) => ({
            id: project.id,
            name: project.name,
            current: search.filters?.projectId === project.id,
            count:
              workflow?.workflowStates.reduce(
                (acc, ws) =>
                  acc +
                  (ws?.cards?.filter(
                    (c) => !project?.id || c?.project?.id === project.id
                  )?.length || 0),
                0
              ) || 0,
          }))}
        onTabClick={(id?: string) => {
          navigate({
            to: ".",
            search: {
              ...search,
              filters: {
                ...search.filters,
                projectId: id,
              },
            },
          });
        }}
      />

      {workflow && <Workflow key={workflow.id} workflow={workflow} />}
    </div>
  );
}
