import { defineMutation } from "nitro-graphql/utils/define";
import { mockUsers } from "./userStore";

export const data = defineMutation({
  createUser: (_parent: unknown, args: { input: { email: string; name?: string } }) => {
    const newUser = {
      id: String(mockUsers.length + 1),
      email: args.input.email,
      name: args.input.name,
      createdAt: new Date().toISOString(),
    };

    mockUsers.push(newUser);
    return newUser;
  },
})
