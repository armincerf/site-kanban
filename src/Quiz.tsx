import {
  useForm,
  SubmitHandler,
  SubmitErrorHandler,
  useFieldArray,
  Control,
  useWatch,
  Controller,
  useController,
} from "react-hook-form";
import { useEffect, useState } from "react";

// Tasks:
// - Add a few questions to the quiz
// - Add a few answers to the quiz
// - Use a few different types of field
// - Use proper typescript types
// - onSubmit print out the answers

const mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

let renderCount = 0;

type ChooseFrom = "utility" | "component" | "other";

type NotHook = "useTable" | "usefilter" | "useeffect" | "usesortby";

type Quiz = {
  name: string;
  email: string;
  age: number;
  definition: string;
  choose: ChooseFrom;
  isNotTableHook: NotHook;
  showGender: boolean;
  gender: string;
  actions: string;
  proffesion: string;
  controlled: string;
  options: string[];
  cart: {
    name: string;
    level: number;
  }[];
};

const Total = ({ control }: { control: Control<Quiz> }) => {
  const formValues = useWatch({
    name: "cart",
    control,
  });
  const total = formValues.length;
  const avrLevel =
    formValues.reduce((acc, curr) => acc + (curr.level || 0), 0) /
    formValues.length;

  return (
    <p>
      Total Hooks Know: {total}, average level: {avrLevel}
    </p>
  );
};

const RadioInput = ({
  options,
  control,
  name,
}: {
  options: any;
  control: any;
  name: any;
}) => {
  const { field } = useController({
    control,
    name,
  });

  const [value, setValue] = useState(field.value || "");

  console.log(value);

  return (
    <div className="flex flex-row justify-between">
      {options.map((option: any, index: number) => (
        <label key={option}>
          <input
            onChange={(e) => {
              // const valueCopy = [...value];

              // update checkbox value

              // valueCopy[index] = e.target.checked ? e.target.value : null;
              // console.log(
              //   (valueCopy[index] = e.target.checked ? e.target.value : null)
              // );

              // send data to react hook form
              field.onChange(e.target.value);
              // console.log(field.onChange(e.target.value));

              // update local state
              setValue(e.target.value);
            }}
            checked={value.includes(option)}
            type="radio"
            value={option}
            name={name}
          />
          {option}
        </label>
      ))}
    </div>
  );
};

export default function Quiz() {
  const [inputValue, setInputValue] = useState("");
  const [controlledInput, setControlledInput] = useState("it is controlled");

  const {
    register,
    watch,
    control,
    getFieldState,
    formState,
    formState: { errors, isSubmitSuccessful, isDirty },
    handleSubmit,
    reset,
  } = useForm<Quiz>({
    defaultValues: {
      age: 18,
      cart: [{ name: "", level: 0 }],
    },
    mode: "onBlur",
  });

  const { fields, append, remove } = useFieldArray({
    name: "cart",
    control,
  });

  const onSubmit: SubmitHandler<Quiz> = (data) => {
    console.log("SubmitHandler", data);
  };

  const onError: SubmitErrorHandler<Quiz> = (error) => {
    console.log("SubmitErrorHandler", error);
  };

  const watchshowGender = watch("showGender", false);

  useEffect(() => {
    if (isSubmitSuccessful) {
      reset();
    }
  }, [isSubmitSuccessful, reset]);

  const ageState = getFieldState("age", formState);
  const cardState = getFieldState("cart", formState);

  // console.log("card state", cardState);
  // console.log("age state", ageState);
  console.log(inputValue);

  renderCount++;

  console.log(renderCount);

  return (
    <>
      <h1 className="text-center font-semibold my-10 text-orange-800 text-lg">
        React Table Quiz
      </h1>

      <form
        onSubmit={handleSubmit(onSubmit, onError)}
        className="flex flex-col w-4/5  mx-auto p-10 border-2 border-slate-200 rounded-md box-border"
      >
        <h1>{renderCount}</h1>
        <fieldset className="flex flex-col border-2 border-emerald-600 p-10 mb-4 rounded-md box-border">
          <legend className="text-center font-semibold">About you</legend>
          <input
            type="text"
            placeholder="Enter your name"
            {...register("name", {
              required: "This field is required!",
            })}
            className="mb-2 rounded"
          />
          {errors.name && (
            <p className="text-red-700 text-center">{errors.name.message}</p>
          )}

          <input
            type="text"
            placeholder="Profession"
            {...register("proffesion", { disabled: true })}
          />

          <input
            type="number"
            placeholder="Enter your age"
            {...register("age", {
              required: "This field is required!",
              min: {
                value: 18,
                message: "You are too young!",
              },
            })}
            className="mb-2 rounded"
          />
          {errors.age && (
            <p className="text-red-700 text-center">{errors.age.message}</p>
          )}

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />

          <input
            type="email"
            placeholder="Enter your email"
            {...register("email", {
              required: "This field is required!",
              validate: (val) => val.match(mailformat) || "Email is invalid",
            })}
            className="mb-2 rounded"
          />
          {errors.email && (
            <p className="text-red-700 text-center">{errors.email.message}</p>
          )}
        </fieldset>
        <label>How would you define React Table?</label>
        <textarea {...register("definition")} />
        <label>React Table is:</label>
        <select {...register("choose")}>
          <option value="utility">Table Utiliy</option>
          <option value="component">Table Component</option>
          <option value="other">Other</option>
        </select>
        <p className="mt-4 mb-2">Which one is not a React Table hook?</p>
        <div className="flex flex-row flex-wrap justify-between">
          <label>
            <input
              type="radio"
              value="useTable"
              {...register("isNotTableHook")}
            />
            useTable
          </label>
          <label>
            <input
              type="radio"
              value="useFilter"
              {...register("isNotTableHook")}
            />
            useFilter
          </label>
          <label>
            <input
              type="radio"
              value="useSortBy"
              {...register("isNotTableHook")}
            />
            useSortBy
          </label>
          <label>
            <input
              type="radio"
              value="useEfffect"
              {...register("isNotTableHook")}
            />
            useEffect
          </label>
        </div>

        <div className="mt-4 mb-2">
          <input type="checkbox" id="gender" {...register("showGender")} />
          <label htmlFor="gender" className="ml-2">
            Show gender (optional)
          </label>

          {watchshowGender && (
            <RadioInput
              options={["female", "male", "other"]}
              control={control}
              name="gender"
            />
          )}
        </div>

        {/* <label>
            // <input type="radio" value="Female" {...register("gender")} />
            // Female //{" "}
          </label>
          //{" "}
          <label>
            // <input type="radio" value="Male" {...register("gender")} />
            // Male //{" "}
          </label>
          //{" "}
          <label>
            // <input type="radio" value="Other" {...register("gender")} />
            // Other //{" "}
          </label> */}

        <h2>Table Actions</h2>
        <RadioInput
          options={["filtering", "sorting", "grouping"]}
          control={control}
          name="actions"
        />

        <p className="mt-4 mb-2">
          How many React Table Hooks do you know? What's the understanding level
          of it?
        </p>
        {fields.map((field, index) => {
          return (
            <div
              key={field.id}
              className="flex flex-row flex-wrap justify-between w-full m-auto"
            >
              <div key={field.id}>
                <input
                  type="text"
                  placeholder="Hook Name"
                  {...register(`cart.${index}.name` as const)}
                  className="mb-2 mr-2 rounded"
                />

                <input
                  type="number"
                  placeholder="Level of Understanding"
                  {...register(`cart.${index}.level` as const, {
                    valueAsNumber: true,
                    required: true,
                  })}
                  className="mb-2 rounded"
                />
              </div>

              <div className="mb-5 xs:mb-0 justify-end sm:justify-center">
                <button
                  type="button"
                  className="bg-red-700 hover:bg-red-500 mx-2 px-4 py-1 border-2 border-red-700 hover:border-red-500 rounded-lg text-lg font-bold"
                  onClick={() => remove(index)}
                >
                  -
                </button>

                <button
                  type="button"
                  className="bg-green-700 hover:bg-green-300 mx-2 px-3 py-1  border-2 border-green-700 hover:border-green-300 rounded-lg text-lg font-bold"
                  onClick={() =>
                    append({
                      name: "",
                      level: 0,
                    })
                  }
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
        {isDirty && <Total control={control} />}
        <Controller
          control={control}
          name="controlled"
          render={({
            field: { onChange, onBlur, value, name, ref },
            fieldState: { invalid, isTouched, isDirty, error },
            formState,
          }) => (
            <input
              type="text"
              onChange={(e) => setControlledInput(e.target.value)}
              value={controlledInput}
              name="controlled"
            />
          )}
        />
        <button
          type="submit"
          className="bg-slate-500 hover:bg-blue-400 py-2 px-4 mt-10 border-2 border-slate-500 hover:border-blue-400 rounded-lg text-xs font-medium w-fit mx-auto"
        >
          Submit
        </button>
      </form>
    </>
  );
}
function register(
  arg0: string
): JSX.IntrinsicAttributes &
  import("react").ClassAttributes<HTMLInputElement> &
  import("react").InputHTMLAttributes<HTMLInputElement> {
  throw new Error("Function not implemented.");
}
