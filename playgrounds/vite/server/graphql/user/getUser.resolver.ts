import { defineQuery } from "nitro-graphql/utils/define";
import { mockUsers } from "./userStore";

export const data = defineQuery({
  getUser: (_parent, args) => {
    console.log(args)
    const user = mockUsers.find(u => u.id === args.id);
    return user || null;
  },
})