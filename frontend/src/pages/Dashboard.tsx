import { Title, Text, SimpleGrid, Card, Group } from '@mantine/core';
import { IconUsers, IconBook, IconMessageCircle } from '@tabler/icons-react';

export default function Dashboard() {
  return (
    <div>
      <Title order={2} mb="lg">Dashboard</Title>
      
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        <Card withBorder padding="lg" radius="md">
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">
              Total Leads
            </Text>
            <IconUsers size="1.4rem" stroke={1.5} />
          </Group>
          <Group align="flex-end" gap="xs" mt={25}>
            <Text size="xl" fw={700}>
              --
            </Text>
          </Group>
          <Text size="xs" c="dimmed" mt={7}>
            Active in database
          </Text>
        </Card>

        <Card withBorder padding="lg" radius="md">
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">
              Knowledge Entries
            </Text>
            <IconBook size="1.4rem" stroke={1.5} />
          </Group>
          <Group align="flex-end" gap="xs" mt={25}>
            <Text size="xl" fw={700}>
              --
            </Text>
          </Group>
          <Text size="xs" c="dimmed" mt={7}>
            Documents in vector store
          </Text>
        </Card>

        <Card withBorder padding="lg" radius="md">
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">
              Messages Processed
            </Text>
            <IconMessageCircle size="1.4rem" stroke={1.5} />
          </Group>
          <Group align="flex-end" gap="xs" mt={25}>
            <Text size="xl" fw={700}>
              --
            </Text>
          </Group>
          <Text size="xs" c="dimmed" mt={7}>
            Total AI interactions
          </Text>
        </Card>
      </SimpleGrid>
    </div>
  );
}
