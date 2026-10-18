import { Code, Group, ScrollArea, Stack, Title } from "@mantine/core";
import { CopyAction } from "./CopyAction.tsx";

function prettyXml(xml: string): string {
  let depth = 0;
  return xml
    .replace(/>\s*</g, ">\n<")
    .split("\n")
    .map((line) => {
      if (/^<\/.+>/.test(line)) depth = Math.max(0, depth - 1);
      const indented = `${"  ".repeat(depth)}${line}`;
      if (/^<[^!?/][^>]*[^/]>$/.test(line) && !/<\/.+>/.test(line)) depth += 1;
      return indented;
    })
    .join("\n");
}

/** An EBICS message to read and to copy as it went over the wire — indented for reading, copied unchanged. */
export function XmlBlock({ title, xml }: { title: string; xml: string }) {
  return (
    <Stack gap="md" miw={0}>
      <Group justify="space-between" wrap="nowrap">
        <Title order={4}>{title}</Title>
        <CopyAction value={xml} label={`${title} kopieren`} />
      </Group>
      <ScrollArea.Autosize mah={320} type="auto">
        <Code block fz="xs">
          {prettyXml(xml)}
        </Code>
      </ScrollArea.Autosize>
    </Stack>
  );
}
