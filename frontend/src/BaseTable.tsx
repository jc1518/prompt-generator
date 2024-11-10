import React, { useState, useCallback } from "react";
import {
  Table,
  SpaceBetween,
  ButtonDropdown,
  Header,
  Box,
} from "@cloudscape-design/components";

export interface BaseTableItem {
  id: string;
  status: string;
}

interface BaseTableProps<T extends BaseTableItem> {
  items: T[];
  onDeleteItems: (itemIds: string[]) => void;
  columnDefinitions: any[];
  tableHeader: string;
}

export const XMLComponent: React.FC<{ content: string }> = ({ content }) => {
  const formattedContent = content.replace(
    /(<\/?(?:Instructions|scratchpad|recommendation|reasoning)(?:\s+[^>]*)?>)/g,
    "$1"
  );
  return (
    <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
      {formattedContent}
    </pre>
  );
};

export const CenteredCell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      height: "100%",
      minHeight: "60px",
    }}
  >
    {children}
  </div>
);

export function BaseTable<T extends BaseTableItem>({
  items,
  onDeleteItems,
  columnDefinitions,
  tableHeader,
}: BaseTableProps<T>) {
  const [selectedItems, setSelectedItems] = useState<T[]>([]);

  const handleDelete = useCallback(() => {
    const itemIds = selectedItems.map((item) => item.id);
    onDeleteItems(itemIds);
    setSelectedItems([]);
  }, [selectedItems, onDeleteItems]);

  return (
    <Box>
      <Table
        columnDefinitions={columnDefinitions}
        items={items}
        stickyHeader
        resizableColumns
        stripedRows
        wrapLines
        selectedItems={selectedItems}
        selectionType="multi"
        onSelectionChange={({ detail }) =>
          setSelectedItems(detail.selectedItems)
        }
        variant="container"
        sortingDisabled={true}
        contentDensity="comfortable"
        loadingText={`Loading ${tableHeader.toLowerCase()}...`}
        empty={
          <Box textAlign="center">No {tableHeader.toLowerCase()} found.</Box>
        }
        header={
          <Header
            counter={
              selectedItems.length
                ? `(${selectedItems.length}/${items.length})`
                : ""
            }
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <ButtonDropdown
                  items={[
                    {
                      text: "Delete",
                      id: "delete",
                      disabled: selectedItems.length === 0,
                    },
                  ]}
                  onItemClick={(e) => {
                    if (e.detail.id === "delete") {
                      handleDelete();
                    }
                  }}
                >
                  Actions
                </ButtonDropdown>
              </SpaceBetween>
            }
          >
            {tableHeader}
          </Header>
        }
      />
    </Box>
  );
}
