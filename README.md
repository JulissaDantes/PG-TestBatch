TODOs
[X] Making insert run without tooling
[ ] Making select run without tooling
[ ] using real table schema and scripts
[ ] Using knex since we are using that

Right now it opens a session with the db to insert the chunk size of records. In the future maybe we create a script with the chunk and send each one at a time. We need to also use knex since that's what we use in the CAS repo to do the insert. And the final step will be figure out reading logic in chunks as well.