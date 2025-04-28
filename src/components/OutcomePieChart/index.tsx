import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";


interface OutcomeData {
  name: string;
  value: number;
  color: string;
}

interface PieChartOutcome {
  include: number;
  exclude: number;
  withdraw: number;
  Incoming: number;
}

interface Props {
  pieChartOutcome: PieChartOutcome | null;

}

const OutcomePieChart: React.FC<Props> = ({ pieChartOutcome}) => {
  const [outcomeData, setOutcomeData] = useState<OutcomeData[]>([]);

  const formatWithCommas = (value: number): string => {
    return value.toLocaleString();
  };
  const interleaveOutcome = (data: any[]) => {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const result = [];
    let i = 0,
      j = sorted.length - 1;
    while (i <= j) {
      if (i === j) result.push(sorted[i]);
      else {
        result.push(sorted[i]);
        result.push(sorted[j]);
      }
      i++;
      j--;
    }
    return result;
  };
  useEffect(() => {
    if (pieChartOutcome) {
      const formatted = interleaveOutcome(
        [
          {
            name: "Included",
            value: pieChartOutcome.include,
            color: "#4caf50",
          },
          {
            name: "Excluded",
            value: pieChartOutcome.exclude,
            color: "#f44336",
          },
          {
            name: "Withdrawn",
            value: pieChartOutcome.withdraw,
            color: "#ff9800",
          },
          // {
          //   name: "Incoming",
          //   value: pieChartOutcome.Incoming,
          //   color: "#03a9f4",
          // },
        ].filter((item) => item.value > 0)
      );
      setOutcomeData(formatted);
    }
  }, [pieChartOutcome, interleaveOutcome]);

  return (
      <ResponsiveContainer width="100%" height={250}>
    <PieChart >
      <Pie
        data={outcomeData}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={75}
        label={({ cx, cy, midAngle, innerRadius, outerRadius, name, value, index }) => {
          const RADIAN = Math.PI / 180;
          const radius = innerRadius + (outerRadius - innerRadius) * 1.1;
          const x = cx + radius * Math.cos(-midAngle * RADIAN);
          const y = cy + radius * Math.sin(-midAngle * RADIAN);

          return (
            <text
              x={x}
              y={y}
              fill={outcomeData[index].color}
              textAnchor={x > cx ? "start" : "end"}
              dominantBaseline="central"
              fontSize={11}
            >
              {`${name}: ${formatWithCommas(value)}`}
            </text>
          );
        }}
        labelLine={false}
      >
        {outcomeData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
      <Tooltip />
    </PieChart>
    </ResponsiveContainer>
  );
};

export default OutcomePieChart;
