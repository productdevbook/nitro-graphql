// Mock user database - replace with actual database
export const mockUsers: Array<{
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}> = [
  {
    id: '1',
    email: 'user1@example.com',
    name: 'John Doe',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    email: 'user2@example.com',
    name: 'Jane Smith',
    createdAt: new Date().toISOString(),
  },
];
