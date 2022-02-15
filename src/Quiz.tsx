import { useForm } from "react-hook-form";

type Quiz = any;

// Tasks:
// - Add a few questions to the quiz
// - Add a few answers to the quiz
// - Use a few different types of field
// - Use proper typescript types
// - onSubmit print out the answers

export default function Quiz() {
  const formHooks = useForm<Quiz>();
  return (
    <div>
      <h1>Quiz</h1>
    </div>
  );
}
