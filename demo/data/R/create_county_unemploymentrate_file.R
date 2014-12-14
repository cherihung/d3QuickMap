#read in data files: cfips = state and county fips; sddatacrate = county unemployement rate
cfips <- read("national_county.csv")
curate <- read.csv("sourcedata_unemrate_counties.csv")

#format FIPS data: pad zeros to county FIPS
cfips[,3] <- sprintf("%03d", as.numeric(cfips[,3]))

#format FIPS data: concatenate state and county FIPS
cfips[,3] <- paste(cfips[,2],cfips[,3],sep="")

#format colnames for cfips and curate
colnames(cfips) <- c("state","county","sfips","cfips")
colnames(curate) <- c("cfips","unemployrate")

#merge two dataframes to create a new file; then sort by cfips column, clean up colnames
m <- merge(cfips, curate, by="cfips")
m[,1] <- as.numeric(m[,1])
m <- m[order(m$cfips),]
colnames(m) <- c("id","state","sfips","county","unemployrate")

#remove the empty row.names column created after order
row.names(m)<-NULL

#write merged file to csv for use
write.csv(m, file = "output-unemploycounties.csv")