import { Dispatch, SetStateAction, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSearch } from "react-location";
import { useQueryClient } from "react-query";
import { toast } from "react-toastify";
import {
  CreateWorkflowStateMutationVariables,
  UpdateWorkflowStateMutationVariables,
  useAllWorkflowStatesQuery,
  useCreateWorkflowStateMutation,
  useUpdateWorkflowStateMutation,
} from "../generated/graphql";
import { defaultMutationProps, mapKeys, notEmpty } from "../kanbanHelpers";
import { LocationGenerics, ModalStateProps, TWorkflow } from "../types";
import { ModalForm } from "./Modal";

type AddWorkflowStateInput = Omit<
  Omit<Omit<CreateWorkflowStateMutationVariables, "colId">, "workflowStateIds">,
  "workflowId"
>;

type AddWorkflowStateModalProps = ModalStateProps;

export function AddWorkflowStateModal({
  isOpen,
  setIsOpen,
}: AddWorkflowStateModalProps) {
  const queryClient = useQueryClient();
  const addColMutation = useCreateWorkflowStateMutation({
    ...defaultMutationProps(queryClient),
  });
  const { modalState } = useSearch<LocationGenerics>();
  const workflowId = modalState?.workflowId;
  const cols =
    useAllWorkflowStatesQuery().data?.allWorkflowStates?.filter(notEmpty) ?? [];
  const addWorkflowState = (col: AddWorkflowStateInput) => {
    if (workflowId) {
      setIsOpen(false);
      const colId = `col-${Date.now()}`;
      addColMutation.mutate({
        ...col,
        workflowStateIds: [...cols.map((c) => c.id), colId],
        workflowId,
        colId,
      });
    }
  };
  const formHooks = useForm<AddWorkflowStateInput>();
  return (
    <ModalForm<AddWorkflowStateInput>
      title="Add WorkflowState"
      formHooks={formHooks}
      onSubmit={formHooks.handleSubmit(addWorkflowState, console.warn)}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      fields={[
        {
          id: "name",
          path: "workflowStateName",
          rules: {
            required: true,
          },
          label: "WorkflowState Name",
          type: "text",
        },
      ]}
    />
  );
}

type UpdateWorkflowStateInput = Omit<
  Omit<Omit<UpdateWorkflowStateMutationVariables, "colId">, "workflowStateIds">,
  "workflowId"
>;

type UpdateWorkflowStateModalProps = ModalStateProps;

export function UpdateWorkflowStateModal({
  isOpen,
  setIsOpen,
}: UpdateWorkflowStateModalProps) {
  const queryClient = useQueryClient();
  const updateColMutation = useUpdateWorkflowStateMutation({
    ...defaultMutationProps(queryClient),
  });
  const { modalState } = useSearch<LocationGenerics>();
  const colId = modalState?.workflowStateId;
  const workflowState =
    useAllWorkflowStatesQuery().data?.allWorkflowStates?.find(
      (c) => c?.id === colId
    );

  const updateWorkflowState = (col: UpdateWorkflowStateInput) => {
    if (colId) {
      setIsOpen(false);
      updateColMutation.mutate({
        ...col,
        colId,
      });
    }
  };
  const formHooks = useForm<UpdateWorkflowStateInput>();
  useEffect(() => {
    if (workflowState) {
      formHooks.setValue("name", workflowState.name);
      if (workflowState?.description) {
        formHooks.setValue("description", workflowState.description);
      }
    }
  }, [workflowState]);

  return (
    <ModalForm<UpdateWorkflowStateInput>
      title="Update Column"
      formHooks={formHooks}
      onSubmit={formHooks.handleSubmit(updateWorkflowState, console.warn)}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      fields={[
        {
          id: "name",
          path: "name",
          rules: {
            required: true,
          },
          label: "Column Name",
          type: "text",
        },
        {
          id: "description",
          path: "description",
          label: "Description",
          type: "text",
        },
      ]}
    />
  );
}
