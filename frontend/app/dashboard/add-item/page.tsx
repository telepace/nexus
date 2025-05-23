"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addItem } from "@/components/actions/items-action";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submitButton";

const initialState = { message: "" };

export default function CreateItemPage() {
  const [state, dispatch] = useActionState(addItem, initialState);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold text-gray-800 dark:text-white">
            Create New Item
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Enter the details of the new item below.
          </p>
        </header>

        <form
          action={dispatch}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-6"
        >
          <div className="space-y-6">
            <div className="space-y-3">
              <Label
                htmlFor="title"
                className="text-gray-700 dark:text-gray-300"
              >
                Item Title
              </Label>
              <Input
                id="title"
                name="title"
                type="text"
                placeholder="Item title"
                required
                className="w-full border-gray-300 dark:border-gray-600"
              />
              {(state as any).errors?.title && (
                <p className="text-red-500 text-sm">
                  {(state as any).errors.title}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label
                htmlFor="description"
                className="text-gray-700 dark:text-gray-300"
              >
                Item Description
              </Label>
              <Input
                id="description"
                name="description"
                type="text"
                placeholder="Description of the item"
                className="w-full border-gray-300 dark:border-gray-600"
              />
              {(state as any).errors?.description && (
                <p className="text-red-500 text-sm">
                  {(state as any).errors.description}
                </p>
              )}
            </div>
          </div>

          <SubmitButton text="Create Item" />

          {(state as any).message && (
            <div
              className={`mt-2 text-center text-sm ${(state as any).success ? "text-green-500" : "text-red-500"}`}
            >
              <p>{(state as any).message}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
