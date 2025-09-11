import type { NextApiRequest, NextApiResponse } from "next"

type Data = {
  name: string
  version: string
  status: string
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  res.status(200).json({ 
    name: "Vypto API",
    version: "2.2.3",
    status: "active"
  })
}
