# Fallback `Deals` sheet schema

Only used when the project has no deal surface at all. Columns, in order:

| Column        | Contents                                                    |
| ------------- | ----------------------------------------------------------- |
| Deal          | Company or job name (e.g. "Oakridge Plaza — weekly mowing") |
| Contact       | Name                                                        |
| Email         | Address (blank if unknown — never invent one)               |
| Value         | Number, best known estimate                                 |
| Stage         | `new` / `quoted` / `negotiating` / `won` / `lost`           |
| Last activity | ISO date of the last real interaction                       |
| What happened | One line: what that interaction actually was                |
| Next step     | What the user intends to do next ("—" if unknown)           |

The `What happened` column is what makes nudges specific rather than generic — keep it populated whenever a deal is touched.
