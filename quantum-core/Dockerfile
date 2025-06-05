FROM julia:1.9

WORKDIR /app

# Install Julia packages
RUN julia -e 'using Pkg; Pkg.add(["LinearAlgebra", "SparseArrays", "JSON", "HTTP"])'

COPY . .

CMD ["julia", "--project=.", "src/server.jl"]
